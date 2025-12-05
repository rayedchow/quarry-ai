import json
import re
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI

from config import settings
from models import AgentChatRequest, PaymentConfirmation
from database import db
from x402_protocol import x402
from services.reputation_service import reputation_service
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
            "description": "Retrieve actual data rows from a dataset by executing a SQL query. Use this to fetch the actual data (text, values, etc.) that you need to analyze. Returns the actual row data, not just counts. Note: Requires x402 payment.",
            "parameters": {
                "type": "object",
                "properties": {
                    "dataset_id": {
                        "type": "integer",
                        "description": "The ID number of the dataset to query (from the available datasets list)",
                    },
                    "sql_query": {
                        "type": "string",
                        "description": "A SELECT query to retrieve actual data rows (e.g. 'SELECT text FROM table WHERE label = \"positive\" LIMIT 10'). DO NOT use COUNT(*) - this tool returns the actual data rows, not counts. Write SELECT queries that fetch the columns you need to analyze.",
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
    currency: str = "SOL",
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

        # Advanced cost estimation using DuckDB metadata
        query_limit = None
        limit_match = re.search(r"LIMIT\s+(\d+)", sql_upper)
        if limit_match:
            query_limit = int(limit_match.group(1))
            logger.info(f"Found LIMIT in query: {query_limit}")

        # Strategy 1: If query has LIMIT, use it directly (no execution needed)
        if query_limit:
            actual_count = query_limit
            logger.info(f"[ESTIMATE] Using LIMIT as estimate: {actual_count}")

        # Strategy 2+: For queries without small LIMIT, need to estimate
        else:
            try:
                count_query = sql_query.strip()
                if "LIMIT" in sql_upper:
                    count_query = count_query[: sql_query.upper().find("LIMIT")]
                if "OFFSET" in sql_upper:
                    count_query = count_query[: sql_query.upper().find("OFFSET")]

                if count_query.upper().startswith("SELECT"):
                    from_idx = count_query.upper().find("FROM")
                    if from_idx > 0:
                        count_query = f"SELECT COUNT(*) {count_query[from_idx:]}"

                # Try EXPLAIN (FORMAT JSON) first - true quote mode, no execution
                logger.info("[ESTIMATE] Trying EXPLAIN (FORMAT JSON) - quote mode")
                explain_query = f"EXPLAIN (FORMAT JSON) {sql_query}"
                col_names, rows, _ = db.query_dataset(
                    dataset_slug=dataset_slug, sql=explain_query, limit=1
                )

                if rows and len(rows) > 0:
                    import json as json_lib

                    plan_json = json_lib.loads(rows[0][0])

                    # Extract estimated cardinality from JSON plan
                    def find_cardinality(node):
                        if isinstance(node, dict):
                            if "cardinality" in node:
                                return node["cardinality"]
                            if "estimated_cardinality" in node:
                                return node["estimated_cardinality"]
                            for value in node.values():
                                result = find_cardinality(value)
                                if result:
                                    return result
                        elif isinstance(node, list):
                            for item in node:
                                result = find_cardinality(item)
                                if result:
                                    return result
                        return None

                    estimated_cardinality = find_cardinality(plan_json)
                    if estimated_cardinality:
                        actual_count = int(estimated_cardinality)
                        logger.info(
                            f"[ESTIMATE] EXPLAIN cardinality (no execution): {actual_count}"
                        )
                    else:
                        raise ValueError("No cardinality in EXPLAIN plan")
                else:
                    raise ValueError("EXPLAIN returned no results")

            except Exception as e:
                logger.warning(
                    f"[ESTIMATE] EXPLAIN failed: {e}, falling back to COUNT (will execute)"
                )

                # Fallback: COUNT query (accurate but DOES execute the query)
                try:
                    logger.info("[ESTIMATE] Running COUNT query (executes scan)")
                    count_query = sql_query.strip()
                    if "LIMIT" in sql_upper:
                        count_query = count_query[: sql_query.upper().find("LIMIT")]
                    if "OFFSET" in sql_upper:
                        count_query = count_query[: sql_query.upper().find("OFFSET")]

                    if count_query.upper().startswith("SELECT"):
                        from_idx = count_query.upper().find("FROM")
                        if from_idx > 0:
                            count_query = f"SELECT COUNT(*) {count_query[from_idx:]}"

                    col_names, rows, _ = db.query_dataset(
                        dataset_slug=dataset_slug, sql=count_query.strip(), limit=1
                    )

                    if rows and len(rows) > 0 and len(rows[0]) > 0:
                        actual_count = int(rows[0][0])
                        logger.info(
                            f"[ESTIMATE] COUNT returned (executed): {actual_count}"
                        )
                    else:
                        raise ValueError("COUNT returned no results")

                except Exception as e2:
                    logger.warning(
                        f"[ESTIMATE] COUNT failed: {e2}, using dataset metadata"
                    )
                    # Final fallback: use dataset row count from parquet metadata
                    actual_count = dataset.row_count
                    logger.info(f"[ESTIMATE] Fallback to dataset total: {actual_count}")

        # Final estimate: min of actual count and query limit (no artificial cap)
        if query_limit:
            estimated_rows = min(actual_count, query_limit)
        else:
            # If no LIMIT specified, we'll return all matching rows
            # For very large results, may want to warn user about cost
            estimated_rows = actual_count

        logger.info(
            f"[ESTIMATE] Final: {estimated_rows} rows (actual: {actual_count}, limit: {query_limit})"
        )

        total_cost = estimated_rows * price_per_row
        logger.info(
            f"[COST] Total: {total_cost} SOL ({estimated_rows} rows × {price_per_row} SOL/row)"
        )

        # Get publisher wallet from dataset
        publisher_wallet = dataset.publisher_wallet
        if not publisher_wallet:
            # Fallback to platform wallet if publisher didn't set one
            from config import settings

            publisher_wallet = settings.payment_wallet_address
            if not publisher_wallet:
                raise ValueError(
                    "No payment recipient configured. Dataset publisher must set wallet address."
                )

        # Create x402 payment request with publisher's wallet
        resource_id = f"{dataset_slug}:{sql_query[:50]}"
        payment_request = x402.create_payment_request(
            amount=total_cost,
            resource_id=resource_id,
            description=f"Query {dataset_name} ({estimated_rows} rows)",
            recipient_wallet=publisher_wallet,  # Pay publisher directly
            currency=currency,
        )

        # Store query info with challenge ID for later execution
        challenge_id = payment_request["challenge_id"]
        logger.info(f"[PAYMENT CREATE] Storing challenge {challenge_id}")
        logger.info(f"[PAYMENT CREATE] SQL: {sql_query}")

        x402.pending_payments[challenge_id]["dataset_slug"] = dataset_slug
        x402.pending_payments[challenge_id]["sql_query"] = sql_query

        logger.info(
            f"[PAYMENT CREATE] Pending payments now: {list(x402.pending_payments.keys())}"
        )

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
            "currency": currency,
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
You have access to the query_dataset tool which retrieves actual data rows (not counts).

CRITICAL: When using query_dataset:
- Write SELECT queries that fetch the actual data columns (e.g. SELECT text, label FROM table)
- DO NOT write COUNT(*) queries - the tool returns actual row data UNLESS explicitly asked to do so
- The tool will return the actual data rows you can analyze

IMPORTANT: Use proper markdown formatting:
- Put blank lines (double newline) between paragraphs
- Put blank lines before and after headers
- Put blank lines before and after lists
- Use proper markdown syntax"""

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
                # Convert single newlines to double for markdown paragraph breaks
                fixed_content = delta.content.replace("\n", "\n\n")
                # Debug log
                if "\n" in delta.content:
                    print(
                        f"[STREAM] Original had newline, converted: {repr(delta.content)} -> {repr(fixed_content)}"
                    )
                yield f"data: {fixed_content}\n\n"

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
                            # Get currency from request (default to SOL for backwards compatibility)
                            currency = getattr(request, "currency", "SOL")
                            result = execute_query_tool(
                                dataset_slug=dataset_slug,
                                dataset_name=dataset_name,
                                sql_query=sql_query,
                                price_per_row=price_per_row,
                                currency=currency,
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
    logger.info("[PAYMENT CONFIRM] Received confirmation request")
    logger.info(f"[PAYMENT CONFIRM] Challenge ID: {payment.query_id}")
    logger.info(f"[PAYMENT CONFIRM] Transaction: {payment.transaction_signature}")
    logger.info(
        f"[PAYMENT CONFIRM] Pending payments: {list(x402.pending_payments.keys())}"
    )

    # Get the stored payment info before verification
    if payment.query_id not in x402.pending_payments:
        logger.error("[PAYMENT CONFIRM] Challenge ID not found in pending payments!")
        logger.error(
            f"[PAYMENT CONFIRM] Available challenge IDs: {list(x402.pending_payments.keys())}"
        )
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
        # Execute query WITHOUT artificial limit - let the user's query run as-is
        # (the query itself may have LIMIT, or we'll return all matching rows)
        col_names, rows, total = db.query_dataset(
            dataset_slug=payment_info["dataset_slug"],
            sql=payment_info["sql_query"],
            limit=10000,  # High limit to not restrict user queries
        )

        # Create usage receipt attestation (proof of purchase for reviews)
        try:
            logger.info("[PAYMENT CONFIRM] Creating usage receipt attestation...")

            # Get dataset info
            dataset = db.get_dataset_by_slug(payment_info["dataset_slug"])
            if dataset and payment.payer_wallet:
                receipt = await reputation_service.create_usage_receipt(
                    reviewer_wallet=payment.payer_wallet,
                    dataset_id=dataset.id,
                    dataset_version="v1",
                    tx_signature=payment.transaction_signature,
                    rows_accessed=len(rows),
                    cost_paid=payment_info["amount"],
                )
                logger.info(
                    f"[PAYMENT CONFIRM] Usage receipt created: {receipt['receipt_id']} for {payment.payer_wallet}"
                )
            else:
                logger.warning(
                    "[PAYMENT CONFIRM] Skipping usage receipt - no payer wallet provided"
                )
        except Exception as receipt_error:
            logger.error(
                f"[PAYMENT CONFIRM] Failed to create usage receipt: {receipt_error}"
            )
            # Don't fail the query if receipt creation fails

        # Return ALL rows retrieved (user paid for them!)
        return {
            "success": True,
            "columns": col_names,
            "rows": rows,  # Return ALL rows
            "total_rows": total,
            "returned_rows": len(rows),
            "transaction": payment.transaction_signature,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query execution failed: {str(e)}")
