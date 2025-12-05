import json
import re
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI

from config import settings
from models import AgentChatRequest, PaymentConfirmation
from database import db
from x402_protocol import x402
import logging

router = APIRouter(prefix="/agent", tags=["agent"])

# Initialize OpenAI client
client = None
if settings.openai_api_key:
    client = AsyncOpenAI(api_key=settings.openai_api_key)

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
logger.addHandler(logging.StreamHandler())


# Tool definition for querying datasets
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "query_dataset",
            "description": "Execute a READ-ONLY SQL query on a specific dataset to retrieve data. Use this to answer questions about the data. Note: This requires payment via x402 protocol.",
            "parameters": {
                "type": "object",
                "properties": {
                    "dataset_id": {
                        "type": "integer",
                        "description": "The ID number of the dataset to query (from the available datasets list)",
                    },
                    "sql_query": {
                        "type": "string",
                        "description": "The SELECT SQL query to execute. Must be read-only (no INSERT, UPDATE, DELETE, DROP, etc.)",
                    },
                },
                "required": ["dataset_id", "sql_query"],
            },
        },
    }
]


def execute_query_tool(
    dataset_slug: str,
    dataset_name: str,
    sql_query: str,
    price_per_row: float,
) -> dict:
    """Execute a SQL query on a dataset and return x402 payment request."""
    try:
        # Validate it's a read-only query
        sql_upper = sql_query.upper().strip()
        forbidden_keywords = [
            "INSERT",
            "UPDATE",
            "DELETE",
            "DROP",
            "CREATE",
            "ALTER",
            "TRUNCATE",
        ]
        if any(keyword in sql_upper for keyword in forbidden_keywords):
            return {"error": "Only SELECT queries are allowed"}

        # Get estimated row count for pricing
        dataset = db.get_dataset_by_slug(dataset_slug)
        if not dataset:
            return {"error": f"Dataset {dataset_slug} not found"}

        # Parse LIMIT from original query FIRST
        query_limit = None
        limit_match = re.search(r"LIMIT\s+(\d+)", sql_upper)
        if limit_match:
            query_limit = int(limit_match.group(1))
            logger.info(f"Found LIMIT in query: {query_limit}")
        else:
            logger.info("No LIMIT found in query")

        # For row estimation, if there's a LIMIT, just use that
        # Otherwise use EXPLAIN or COUNT
        if query_limit and query_limit <= 100:
            # Query has small LIMIT, just use it
            actual_count = query_limit
            logger.info(f"Using LIMIT as estimate: {actual_count}")
        else:
            # Need to estimate actual matching rows
            try:
                # Use COUNT query (faster and more reliable than parsing EXPLAIN)
                count_query = sql_query.strip()

                # Remove LIMIT and OFFSET
                if "LIMIT" in sql_upper:
                    count_query = count_query[: sql_query.upper().find("LIMIT")]
                if "OFFSET" in sql_upper:
                    count_query = count_query[: sql_query.upper().find("OFFSET")]

                # Replace SELECT columns with COUNT(*)
                if count_query.upper().startswith("SELECT"):
                    from_idx = count_query.upper().find("FROM")
                    if from_idx > 0:
                        count_query = f"SELECT COUNT(*) {count_query[from_idx:]}"

                logger.info(f"Running COUNT query: {count_query}")

                col_names, rows, _ = db.query_dataset(
                    dataset_slug=dataset_slug, sql=count_query.strip(), limit=1
                )

                if rows and len(rows) > 0 and len(rows[0]) > 0:
                    actual_count = int(rows[0][0])
                    logger.info(f"COUNT query returned: {actual_count}")
                else:
                    actual_count = dataset.row_count
                    logger.info(
                        f"COUNT query failed, using dataset total: {actual_count}"
                    )

            except Exception as e:
                logger.error(f"COUNT query failed: {e}")
                # Fall back to parquet metadata
                actual_count = dataset.row_count
                logger.info(f"Falling back to dataset.row_count: {actual_count}")

        # Estimate is the minimum of: actual count, query limit, and 100 (our max)
        if query_limit:
            estimated_rows = min(actual_count, query_limit, 100)
        else:
            estimated_rows = min(actual_count, 100)

        logger.info(
            f"Final estimation - actual_count: {actual_count}, query_limit: {query_limit}, estimated_rows: {estimated_rows}"
        )

        total_cost = estimated_rows * price_per_row
        logger.info(
            f"Total cost: {total_cost} SOL ({estimated_rows} rows × {price_per_row} SOL/row)"
        )

        # Create x402 payment request
        resource_id = f"{dataset_slug}:{sql_query[:50]}"
        payment_request = x402.create_payment_request(
            amount_sol=total_cost,
            resource_id=resource_id,
            description=f"Query {dataset_name} ({estimated_rows} rows)",
        )

        # Store query info with challenge ID for later execution
        x402.pending_payments[payment_request["challenge_id"]]["dataset_slug"] = (
            dataset_slug
        )
        x402.pending_payments[payment_request["challenge_id"]]["sql_query"] = sql_query

        # Return payment required with x402 protocol info
        return {
            "payment_required": True,
            "challenge_id": payment_request["challenge_id"],
            "dataset_slug": dataset_slug,
            "dataset_name": dataset_name,
            "sql_query": sql_query,
            "estimated_rows": estimated_rows,
            "price_per_row": price_per_row,
            "total_cost": total_cost,
            "payment_details": payment_request,
        }

    except Exception as e:
        return {"error": str(e)}


async def stream_agent_response(request: AgentChatRequest):
    """Generate streaming response from OpenAI with function calling."""
    if not client:
        yield "data: " + '{"error": "OpenAI API key not configured"}\n\n'
        return

    # Build system prompt with dataset context
    system_prompt = """You are Quarry, an AI assistant specialized in helping users analyze and query datasets. 
You have access to tools to query datasets and retrieve data.
Be helpful, concise, and accurate. When users ask about data, use the query_dataset tool to fetch actual data.

IMPORTANT: Format your responses with proper line breaks:
- Use blank lines between paragraphs
- Put each numbered or bulleted list item on a new line
- Add line breaks after headings
- Structure your responses for readability"""

    # Add dataset schemas if datasets are attached
    if request.datasets_info:
        system_prompt += "\n\n## Available Datasets:\n"
        for ds_info in request.datasets_info:
            system_prompt += f"\n**Dataset ID {ds_info.id}: {ds_info.name}**\n"
            system_prompt += f"Table name: `{ds_info.table_name}`\n"
            system_prompt += "Schema:\n"
            for col in ds_info.schema:
                system_prompt += f"  - {col.name}: {col.type}\n"

    # Build messages for OpenAI API
    messages = [{"role": "system", "content": system_prompt}]

    # Add conversation history
    for msg in request.history:
        messages.append({"role": msg.role, "content": msg.content})

    # Add current message
    messages.append({"role": "user", "content": request.message})

    try:
        # Call OpenAI API with streaming and tools
        stream = await client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            temperature=0.7,
            max_tokens=2000,
            tools=TOOLS if request.datasets_info else None,
            stream=True,
        )

        tool_calls = []
        current_tool_call = None

        # Stream the response chunks
        async for chunk in stream:
            delta = chunk.choices[0].delta

            # Handle tool calls
            if delta.tool_calls:
                for tc_delta in delta.tool_calls:
                    if tc_delta.index is not None:
                        # Start new tool call or get existing
                        while len(tool_calls) <= tc_delta.index:
                            tool_calls.append(
                                {"id": "", "function": {"name": "", "arguments": ""}}
                            )
                        current_tool_call = tool_calls[tc_delta.index]

                        if tc_delta.id:
                            current_tool_call["id"] = tc_delta.id
                        if tc_delta.function:
                            if tc_delta.function.name:
                                current_tool_call["function"]["name"] = (
                                    tc_delta.function.name
                                )
                            if tc_delta.function.arguments:
                                current_tool_call["function"]["arguments"] += (
                                    tc_delta.function.arguments
                                )

            # Handle content
            if delta.content:
                yield f"data: {delta.content}\n\n"

            # Check if stream is finished
            if chunk.choices[0].finish_reason == "tool_calls":
                # Execute tool calls
                for tool_call in tool_calls:
                    if tool_call["function"]["name"] == "query_dataset":
                        args = json.loads(tool_call["function"]["arguments"])
                        dataset_id = args.get("dataset_id")
                        sql_query = args.get("sql_query")

                        # Find dataset by ID
                        dataset_slug = None
                        dataset_name = None
                        price_per_row = 0.001

                        for ds_info in request.datasets_info:
                            if ds_info.id == dataset_id:
                                dataset_slug = ds_info.slug
                                dataset_name = ds_info.name
                                # Get price from database
                                dataset = db.get_dataset_by_slug(dataset_slug)
                                if dataset:
                                    price_per_row = dataset.price_per_row
                                break

                        if not dataset_slug:
                            result = {"error": "Dataset info not found"}
                        else:
                            # Execute query (will return x402 payment request)
                            result = execute_query_tool(
                                dataset_slug=dataset_slug,
                                dataset_name=dataset_name,
                                sql_query=sql_query,
                                price_per_row=price_per_row,
                            )

                        # Send x402 payment required indicator to user
                        yield "data: \n\n💳 x402 Payment Required\n\n"

                        # Send the payment request as JSON event
                        yield f"data: {json.dumps(result)}\n\n"

        # Send completion signal
        yield "data: [DONE]\n\n"

    except Exception as e:
        yield "data: " + '{"error": "' + str(e).replace('"', '\\"') + '"}\n\n'


@router.post("")
async def chat_with_agent(request: AgentChatRequest):
    """
    Chat with the Quarry AI agent with streaming responses.

    The agent can help you analyze and query datasets.

    - **message**: The user's message
    - **history**: Previous messages in the conversation
    - **attached_datasets**: List of dataset slugs attached to the conversation
    """
    if not client:
        raise HTTPException(
            status_code=503,
            detail="OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.",
        )

    return StreamingResponse(
        stream_agent_response(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/confirm-payment")
async def confirm_payment(payment: PaymentConfirmation):
    """
    Confirm x402 payment and execute the pending query.

    - **query_id**: The challenge ID from the x402 payment request
    - **transaction_signature**: The Solana transaction signature
    """
    # Get the stored payment info before verification
    if payment.query_id not in x402.pending_payments:
        raise HTTPException(status_code=404, detail="Query not found or expired")

    payment_info = x402.pending_payments[payment.query_id].copy()

    # Verify the Solana transaction using x402 protocol
    is_valid = await x402.verify_payment(
        challenge_id=payment.query_id,
        transaction_signature=payment.transaction_signature,
    )

    if not is_valid:
        raise HTTPException(
            status_code=402,
            detail="Payment verification failed. Transaction not found or invalid.",
        )

    # Execute the query
    try:
        col_names, rows, total = db.query_dataset(
            dataset_slug=payment_info["dataset_slug"],
            sql=payment_info["sql_query"],
            limit=100,
        )

        return {
            "success": True,
            "columns": col_names,
            "rows": rows[:10],
            "total_rows": total,
            "returned_rows": len(rows[:10]),
            "transaction": payment.transaction_signature,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query execution failed: {str(e)}")
