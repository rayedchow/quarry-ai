"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState, useRef } from "react";
import {
  Loader2,
  Plus,
  Database,
  Trash2,
  ChevronDown,
  Send,
  X,
  CheckCircle,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { 
  PublicKey, 
  SystemProgram, 
  Transaction,
  LAMPORTS_PER_SOL 
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
} from "@solana/spl-token";
import { WalletButton } from "@/components/ui/wallet-button";
import { api, Dataset, PaymentRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ChatInput } from "@/components/ui/chat-input";
import { ChatMessageList } from "@/components/ui/chat-message-list";
import { MessageLoading } from "@/components/ui/message-loading";
import { cn } from "@/lib/utils";

type QueryResult = {
  columns: string[];
  rows: any[][];
  total_rows: number;
  returned_rows: number;
  transaction: string;
  sql_query: string;
  cost: number;
};

type Message = {
  id: number;
  content: string;
  sender: "user" | "ai";
  paymentRequestId?: string;
  queryResults?: QueryResult[];
};

const initialMessages: Message[] = [
];

function AgentPageContent() {
  const params = useSearchParams();
  const attachedFromQuery = params.getAll("attach");
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loadingDatasets, setLoadingDatasets] = useState(true);
  const [selectedDatasets, setSelectedDatasets] = useState<string[]>(() => {
    // Initialize from query params first, then localStorage
    if (attachedFromQuery.length > 0) return attachedFromQuery;
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('quarry-attached-datasets');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return [];
        }
      }
    }
    return [];
  });
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showAttachedPopup, setShowAttachedPopup] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [paymentProcessing, setPaymentProcessing] = useState<Set<string>>(new Set());
  const [currentAIMessageId, setCurrentAIMessageId] = useState<number | null>(null);
  const [pendingDatasetsInfo, setPendingDatasetsInfo] = useState<any[]>([]);
  const [pendingToolCalls, setPendingToolCalls] = useState<any[]>([]);
  const [executedQueries, setExecutedQueries] = useState<Array<{query: string, result: any}>>([]);
  const [viewingDataModal, setViewingDataModal] = useState<{
    columns: string[];
    rows: any[][];
    sql_query: string;
  } | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<"SOL" | "USDC">("SOL");

  // USDC Mint addresses
  const USDC_MINT_DEVNET = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
  const USDC_MINT_MAINNET = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
  // Use devnet for now (can be switched based on connection endpoint)
  const USDC_MINT = USDC_MINT_DEVNET;

  // Persist selected datasets to localStorage
  useEffect(() => {
    if (hasInitialized.current) {
      localStorage.setItem('quarry-attached-datasets', JSON.stringify(selectedDatasets));
    }
  }, [selectedDatasets]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = '44px'; // Reset to min height
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = Math.min(scrollHeight, 200) + 'px'; // Max 200px
    }
  }, [input]);

  // Close popup when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setShowAttachedPopup(false);
      }
    }
    if (showAttachedPopup) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showAttachedPopup]);

  // Fetch datasets from API
  useEffect(() => {
    api.getDatasets({ limit: 100 })
      .then((response) => {
        setDatasets(response.datasets);
        // Only auto-select on first load if no datasets selected (from query or localStorage)
        if (!hasInitialized.current && selectedDatasets.length === 0 && response.datasets.length > 0) {
          setSelectedDatasets(response.datasets.slice(0, Math.min(2, response.datasets.length)).map(d => d.slug));
        }
        hasInitialized.current = true;
      })
      .catch(console.error)
      .finally(() => setLoadingDatasets(false));
  }, []);

  const handleRemoveDataset = (slug: string) => {
    setSelectedDatasets((prev) => prev.filter((item) => item !== slug));
  };


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input;
    const newMessageId = messages.length + 1;

    setMessages((prev) => [
      ...prev,
      { id: newMessageId, content: userMessage, sender: "user" },
    ]);
    setInput("");
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = '44px';
    }

    // Add placeholder for AI response
    const aiMessageId = newMessageId + 1;
    setCurrentAIMessageId(aiMessageId);
    setMessages((prev) => [
      ...prev,
      { id: aiMessageId, content: "", sender: "ai" },
    ]);
    setIsLoading(true);

    // Clear executed queries for new conversation turn
    setExecutedQueries([]);

    try {
      // Build message history for API
      const history = messages.map(msg => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.content
      }));

      // Build datasets info with schemas
      const datasetsInfo = selectedDatasetObjects.map((dataset, index) => ({
        id: index,
        slug: dataset.slug,
        name: dataset.name,
        table_name: `data_${dataset.slug.replace(/-/g, '_')}`,
        schema: dataset.schema
      }));
      
      // Store for payment handler
      setPendingDatasetsInfo(datasetsInfo);

      // Stream agent response
      let fullContent = "";
      let isFirstChunk = true;
      
      console.log("=== STARTING STREAM ===");
      
      for await (const chunk of api.streamAgentMessage({
        message: userMessage,
        history: history,
        attached_datasets: selectedDatasets,
        datasets_info: datasetsInfo,
        currency: selectedCurrency
      })) {
        console.log("Received chunk:", typeof chunk, chunk);
        
        // Check if chunk is a payment request
        if (typeof chunk === 'object' && 'payment_required' in chunk) {
          const paymentReq = chunk as PaymentRequest;
          
          console.log("Payment request received:", paymentReq.sql_query);
          
          // Add to payment requests array (multiple queries might need payment)
          setPaymentRequests(prev => {
            const exists = prev.some(p => p.payment_details.challenge_id === paymentReq.payment_details.challenge_id);
            if (exists) return prev;
            return [...prev, paymentReq];
          });
          
          setIsLoading(false);
          
          // Store the tool call info for later
          setPendingToolCalls(prev => [...prev, {
            dataset_id: paymentReq.payment_details.resource_id.split(':')[0],
            sql_query: paymentReq.sql_query,
            challenge_id: paymentReq.payment_details.challenge_id
          }]);
          
          // Set a special message for payment requests
          setMessages((prev) => 
            prev.map((msg) =>
              msg.id === aiMessageId
                ? { ...msg, content: "PAYMENT_REQUESTS" }
                : msg
            )
          );
          
          continue; // Don't process as text
        }
        
        if (isFirstChunk) {
          setIsLoading(false);
          isFirstChunk = false;
        }
        
        fullContent += chunk as string;
        const markdownContent = formatMarkdown(fullContent);
        
        setMessages((prev) => 
          prev.map((msg) =>
            msg.id === aiMessageId
              ? { ...msg, content: markdownContent }
              : msg
          )
        );
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setIsLoading(false);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? { ...msg, content: "Sorry, I encountered an error processing your message. Please try again." }
            : msg
        )
      );
    }
  };

  const selectedDatasetObjects = useMemo(() => {
    return selectedDatasets
      .map(slug => datasets.find(d => d.slug === slug))
      .filter((d): d is Dataset => d !== undefined);
  }, [selectedDatasets, datasets]);

  // No formatting needed - backend already converts \n to \n\n
  const formatMarkdown = (content: string): string => {
    return content;
  };

  // Format currency amounts to show at least 1 significant figure
  const formatCurrency = (amount: number, currency: string = "SOL"): string => {
    if (amount === 0) return `0 ${currency}`;
    
    // Find the number of decimal places needed to show at least 1 significant figure
    const absAmount = Math.abs(amount);
    if (absAmount >= 1) {
      return `${amount.toFixed(currency === "USDC" ? 2 : 4)} ${currency}`;
    }
    
    // For small numbers, find first non-zero digit
    const decimals = Math.ceil(-Math.log10(absAmount)) + 1;
    return `${amount.toFixed(Math.min(decimals, currency === "USDC" ? 6 : 10))} ${currency}`;
  };

  // Legacy function for backwards compatibility
  const formatSOL = (amount: number): string => formatCurrency(amount, "SOL");

  const handlePayment = async (payReq: PaymentRequest) => {
    if (!payReq || currentAIMessageId === null) return;
    
    // Check if wallet is connected
    if (!publicKey) {
      alert("Please connect your Solflare wallet first");
      return;
    }
    
    const challengeId = payReq.payment_details.challenge_id;
    setPaymentProcessing(prev => new Set(prev).add(challengeId));
    
    try {
      console.log(`=== PROCESSING PAYMENT ===`);
      console.log(`Challenge ID: ${challengeId}`);
      console.log(`SQL: ${payReq.sql_query}`);
      console.log(`Amount: ${payReq.payment_details.amount_lamports} lamports`);
      
      // Validate recipient address
      if (!payReq.payment_details.recipient || payReq.payment_details.recipient === "") {
        throw new Error("Payment recipient address not configured on backend. Please set PAYMENT_WALLET_ADDRESS in backend .env file");
      }
      
      // Create Solana transaction for x402 payment
      let recipientPubkey: PublicKey;
      try {
        recipientPubkey = new PublicKey(payReq.payment_details.recipient);
      } catch (e) {
        throw new Error(`Invalid recipient address: ${payReq.payment_details.recipient}. Please check PAYMENT_WALLET_ADDRESS in backend .env`);
      }
      
      const currency = payReq.payment_details.currency || payReq.currency || "SOL";
      const transaction = new Transaction();
      
      if (currency === "USDC") {
        // USDC SPL Token Transfer
        console.log(`Creating USDC transfer: ${publicKey.toBase58()} → ${recipientPubkey.toBase58()} (${payReq.payment_details.amount} USDC)`);
        
        const amount = payReq.payment_details.amount_tokens || Math.floor(payReq.payment_details.amount * 1_000_000); // 6 decimals
        
        // Get sender's USDC token account
        const fromTokenAccount = await getAssociatedTokenAddress(
          USDC_MINT,
          publicKey
        );
        
        // Get recipient's USDC token account
        const toTokenAccount = await getAssociatedTokenAddress(
          USDC_MINT,
          recipientPubkey
        );
        
        console.log(`From token account: ${fromTokenAccount.toBase58()}`);
        console.log(`To token account: ${toTokenAccount.toBase58()}`);
        console.log(`Amount: ${amount} (smallest units)`);
        
        // Check if recipient token account exists, if not create it
        try {
          const recipientAccountInfo = await connection.getAccountInfo(toTokenAccount);
          if (!recipientAccountInfo) {
            console.log(`Recipient token account doesn't exist, creating it...`);
            transaction.add(
              createAssociatedTokenAccountInstruction(
                publicKey, // payer
                toTokenAccount, // ata
                recipientPubkey, // owner
                USDC_MINT // mint
              )
            );
          }
        } catch (e) {
          console.warn("Could not check recipient token account, will attempt transfer anyway:", e);
        }
        
        // Add USDC transfer instruction
        transaction.add(
          createTransferCheckedInstruction(
            fromTokenAccount,
            USDC_MINT,
            toTokenAccount,
            publicKey,
            amount,
            6 // USDC decimals
          )
        );
      } else {
        // Native SOL Transfer
        const lamports = payReq.payment_details.amount_lamports || Math.floor(payReq.payment_details.amount * 1_000_000_000);
        console.log(`Creating SOL transfer: ${publicKey.toBase58()} → ${recipientPubkey.toBase58()} (${lamports} lamports)`);
        
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: recipientPubkey,
            lamports: lamports,
          })
        );
      }
      
      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;
      
      console.log(`Sending transaction...`);
      console.log(`Transaction details:`, transaction);
      
      // Check balance before sending
      try {
        if (currency === "USDC") {
          // Check USDC token balance
          const fromTokenAccount = await getAssociatedTokenAddress(USDC_MINT, publicKey);
          const tokenAccountInfo = await connection.getTokenAccountBalance(fromTokenAccount);
          const usdcBalance = parseInt(tokenAccountInfo.value.amount);
          const amount = payReq.payment_details.amount_tokens || Math.floor(payReq.payment_details.amount * 1_000_000);
          
          console.log(`USDC balance: ${usdcBalance} (${(usdcBalance / 1e6).toFixed(2)} USDC)`);
          
          if (usdcBalance < amount) {
            throw new Error(
              `Insufficient USDC balance. Need ${(amount / 1e6).toFixed(2)} USDC, ` +
              `but wallet only has ${(usdcBalance / 1e6).toFixed(2)} USDC. ` +
              `Please add USDC to your wallet.`
            );
          }
          
          // Also check SOL for transaction fees
          const solBalance = await connection.getBalance(publicKey);
          const estimatedFee = 10000; // Higher for token transfers
          if (solBalance < estimatedFee) {
            throw new Error(
              `Insufficient SOL for transaction fee. Need ${(estimatedFee / 1e9).toFixed(6)} SOL for fees, ` +
              `but wallet only has ${(solBalance / 1e9).toFixed(6)} SOL.`
            );
          }
        } else {
          // Check SOL balance
          const balance = await connection.getBalance(publicKey);
          console.log(`Wallet balance: ${balance} lamports (${(balance / 1e9).toFixed(6)} SOL)`);
          
          const lamports = payReq.payment_details.amount_lamports || Math.floor(payReq.payment_details.amount * 1_000_000_000);
          const estimatedFee = 5000; // 5000 lamports ~= 0.000005 SOL
          const totalNeeded = lamports + estimatedFee;
          
          if (balance < totalNeeded) {
            throw new Error(
              `Insufficient balance. Need ${(totalNeeded / 1e9).toFixed(6)} SOL (payment + fee), ` +
              `but wallet only has ${(balance / 1e9).toFixed(6)} SOL. ` +
              `Please add SOL to your wallet.`
            );
          }
        }
      } catch (balanceError: any) {
        if (balanceError.message?.includes('Insufficient')) {
          throw balanceError;
        }
        console.warn('Could not check balance:', balanceError);
      }
      
      // Send transaction (wallet will prompt user to sign)
      let signature;
      try {
        console.log(`Requesting wallet signature...`);
        signature = await sendTransaction(transaction, connection);
        console.log(`✅ Transaction sent: ${signature}`);
      } catch (txError: any) {
        console.error(`❌ Transaction send failed:`, txError);
        console.error(`Error name:`, txError.name);
        console.error(`Error message:`, txError.message);
        console.error(`Error code:`, txError.code);
        
        // Provide user-friendly error messages
        if (txError.message?.includes('User rejected')) {
          throw new Error('Transaction cancelled - you rejected the wallet signature request');
        } else if (txError.message?.includes('insufficient')) {
          throw new Error('Insufficient SOL in wallet for this transaction');
        } else if (txError.name === 'WalletSendTransactionError') {
          throw new Error(`Wallet error: ${txError.message || 'Transaction failed. Please try again.'}`);
        } else {
          throw new Error(`Transaction failed: ${txError.message || 'Unknown error. Please try again.'}`);
        }
      }
      
      // Wait for confirmation
      console.log(`Waiting for confirmation...`);
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      }, 'confirmed');
      
      console.log(`Confirmation received:`, confirmation);
      
      if (confirmation.value.err) {
        throw new Error("Transaction failed to confirm");
      }
      
      console.log(`Transaction confirmed successfully`);
      console.log(`Sending to backend for x402 verification: challenge_id=${challengeId}, signature=${signature}`);
      
      // Give it a moment for the transaction to fully propagate
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Confirm payment with backend using x402 challenge ID
      const result = await api.confirmPayment({
        query_id: challengeId,
        transaction_signature: signature,
        payer_wallet: publicKey.toBase58(),  // Include wallet for usage receipt
        currency: selectedCurrency
      });
      
      console.log(`Backend verification successful:`, result);
      
      // Remove this payment from the list and mark as completed
      setPaymentRequests(prev => prev.filter(p => p.payment_details.challenge_id !== challengeId));
      
      // Create completion data
      const completionData: QueryResult = {
        columns: result.columns,
        rows: result.rows,
        total_rows: result.total_rows,
        returned_rows: result.returned_rows,
        transaction: signature,
        sql_query: payReq.sql_query,
        cost: payReq.total_cost
      };
      
      // IMMEDIATELY update the message to show completion (don't wait for stream)
      setMessages((prev) => 
        prev.map((msg) => {
          if (msg.id === currentAIMessageId && msg.content === "PAYMENT_REQUESTS") {
            const existingResults = msg.queryResults || [];
            return { ...msg, queryResults: [...existingResults, completionData] };
          }
          return msg;
        })
      );
      
      // Force re-render to show completion card
      await new Promise(resolve => setTimeout(resolve, 100));
      
      setPaymentProcessing(prev => {
        const next = new Set(prev);
        next.delete(challengeId);
        return next;
      });
      
      // Store this query result
      const newQueryResult = {
        query: payReq.sql_query,
        result: result
      };
      
      const allQueries = [...executedQueries, newQueryResult];
      setExecutedQueries(allQueries);
      
      console.log("=== PAYMENT CONFIRMED DEBUG ===");
      console.log("Current executed queries:", allQueries);
      console.log("Remaining payment requests:", paymentRequests.length - 1);
      
      // If there are more payments pending, just update the message and wait
      if (paymentRequests.length > 1) {
        console.log("More payments pending, updating message to show remaining...");
        setMessages((prev) => 
          prev.map((msg) =>
            msg.id === currentAIMessageId
              ? { ...msg, content: "PAYMENT_REQUESTS" }
              : msg
          )
        );
        return; // Wait for more payments
      }
      
      // All payments done! Continue with agent
      console.log("All payments complete! Continuing agent conversation...");
      
      // Create a NEW message for the agent's response (keep payment cards visible)
      const responseMessageId = messages.length + 1;
      setCurrentAIMessageId(responseMessageId);
      setMessages((prev) => [
        ...prev,
        { id: responseMessageId, content: "", sender: "ai" }
      ]);
      
      // Continue the agent conversation with ALL query results accumulated
      const updatedHistory = [
        ...messages.filter(m => m.sender === "user" || (m.sender === "ai" && m.id !== currentAIMessageId && m.content !== "PAYMENT_REQUESTS")).map(msg => ({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.content || ""
        }))
      ];
      
      console.log("History being sent (filtered):", updatedHistory);
      
      // Format ALL executed queries so agent knows what data it already has
      let dataAnalysisPrompt = `[EXECUTED QUERIES - Data Available]\n\nYou have already executed ${allQueries.length} quer${allQueries.length > 1 ? 'ies' : 'y'}:\n\n`;
      
      allQueries.forEach((queryData, idx) => {
        dataAnalysisPrompt += `Query ${idx + 1}:\n`;
        dataAnalysisPrompt += `SQL: ${queryData.query}\n`;
        dataAnalysisPrompt += `Total matching rows: ${queryData.result.total_rows}\n`;
        dataAnalysisPrompt += `Returned ${queryData.result.returned_rows} rows\n\n`;
        
        if (queryData.result.rows && queryData.result.rows.length > 0) {
          // Limit to first 100 rows for OpenAI context (but user gets all rows in UI)
          const rowsForAI = queryData.result.rows.slice(0, 100);
          dataAnalysisPrompt += `Data (showing first ${rowsForAI.length} rows for analysis):\n`;
          rowsForAI.forEach((row: any, rowIdx: number) => {
            dataAnalysisPrompt += `  ${rowIdx + 1}. ${JSON.stringify(row)}\n`;
          });
          
          if (queryData.result.rows.length > 100) {
            dataAnalysisPrompt += `\n  ... and ${queryData.result.rows.length - 100} more rows (not shown to save context)\n`;
          }
        }
        dataAnalysisPrompt += `\n`;
      });
      
      dataAnalysisPrompt += `\nIMPORTANT: DO NOT re-query data you already have above. Use this data to answer the user's question. Only make NEW queries if you need DIFFERENT data that you don't already have.`;
      
      console.log("Data analysis prompt:", dataAnalysisPrompt);
      
      // Add as user message with all accumulated data
      updatedHistory.push({
        role: "user",
        content: dataAnalysisPrompt
      });
      
      console.log("Final history with data:", updatedHistory);
      console.log("datasets_info being sent:", pendingDatasetsInfo);
      
      // Stream the agent's response WITH tools still available
      console.log("=== STARTING CONTINUATION STREAM ===");
      let finalContent = "";
      
      for await (const chunk of api.streamAgentMessage({
        message: "",
        history: updatedHistory,
        attached_datasets: selectedDatasets,
        datasets_info: pendingDatasetsInfo, // Keep tools available!
        currency: selectedCurrency
      })) {
        console.log("Continuation chunk:", typeof chunk, JSON.stringify(chunk).slice(0, 100));
        
        if (typeof chunk === 'object' && 'payment_required' in chunk) {
          // Agent wants more data in the continuation - shouldn't happen but handle it
          const nextPaymentReq = chunk as PaymentRequest;
          
          console.log("Additional payment request in continuation:", nextPaymentReq.sql_query);
          
          setPaymentRequests(prev => {
            const exists = prev.some(p => p.payment_details.challenge_id === nextPaymentReq.payment_details.challenge_id);
            if (exists) return prev;
            return [...prev, nextPaymentReq];
          });
          
          setIsLoading(false);
          
          setPendingToolCalls(prev => [...prev, {
            dataset_id: nextPaymentReq.payment_details.resource_id.split(':')[0],
            sql_query: nextPaymentReq.sql_query,
            challenge_id: nextPaymentReq.payment_details.challenge_id
          }]);
          
          // Update message to show payment requests
          setMessages((prev) => 
            prev.map((msg) =>
              msg.id === currentAIMessageId
                ? { ...msg, content: "PAYMENT_REQUESTS" }
                : msg
            )
          );
          
          break; // Stop streaming, wait for payment
        }
        
        finalContent += chunk as string;
        
        if (finalContent.length < 200 || finalContent.length % 100 === 0) {
          console.log("Final content so far:", JSON.stringify(finalContent).slice(0, 200));
        }
        
        const markdownContent = formatMarkdown(finalContent);
        setMessages((prev) => 
          prev.map((msg) =>
            msg.id === responseMessageId
              ? { ...msg, content: markdownContent }
              : msg
          )
        );
      }
      
      console.log("Final content complete:", JSON.stringify(finalContent));
      
      // Clear after successful completion
      setPaymentRequests([]);
      setPendingToolCalls([]);
      
    } catch (error) {
      console.error("❌ x402 payment failed:", error);
      
      let errorMessage = "Unknown error";
      let errorTitle = "Payment Failed";
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Provide user-friendly messages
        if (errorMessage.includes('rejected') || errorMessage.includes('cancelled')) {
          errorTitle = "Transaction Cancelled";
          errorMessage = "You cancelled the transaction in your wallet.";
        } else if (errorMessage.includes('Insufficient') || errorMessage.includes('insufficient')) {
          errorTitle = "Insufficient Funds";
          errorMessage = "Your wallet doesn't have enough SOL for this transaction. Please add SOL and try again.";
        } else if (errorMessage.includes('User rejected')) {
          errorTitle = "Transaction Cancelled";
          errorMessage = "You cancelled the transaction in your wallet.";
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        errorMessage = JSON.stringify(error);
      }
      
      // Show error in the message
      setMessages((prev) => 
        prev.map((msg) =>
          msg.id === currentAIMessageId
            ? { ...msg, content: `❌ **${errorTitle}**\n\n${errorMessage}\n\n*Tip: You can try again by sending your message again, or ask a different question.*` }
            : msg
        )
      );
      setPaymentRequests([]);
      setPendingToolCalls([]);
      setPaymentProcessing(new Set());
    }
  };


  return (
    <div className="flex flex-col h-[calc(100vh-140px)] -mt-4">
      {/* Chat Area - Main Focus */}
      <div className="flex flex-col rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm overflow-hidden h-full">

        {/* Messages container - must have min-h-0 to allow flex shrinking */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ChatMessageList className="h-full p-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="relative mb-8">
                {/* Gradient orb background */}
                <div className="absolute inset-0 blur-3xl opacity-30">
                  <div className="w-32 h-32 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-full"></div>
                </div>
                {/* Icon */}
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-white/10 flex items-center justify-center backdrop-blur-sm">
                    <Database className="w-10 h-10 text-violet-400" />
                  </div>
                </div>
              </div>
              
              <h3 className="text-xl font-semibold text-white mb-2">
                Ready to explore your data
              </h3>
              <p className="text-white/50 text-sm max-w-sm mb-6">
                {selectedDatasetObjects.length > 0 
                  ? `You have ${selectedDatasetObjects.length} dataset${selectedDatasetObjects.length !== 1 ? 's' : ''} attached. Ask me anything about your data.`
                  : "Attach a dataset to get started with AI-powered data analysis."
                }
              </p>
              
              {selectedDatasetObjects.length === 0 && (
                <Link
                  href="/datasets"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-sm transition-all"
                >
                  <Database className="w-4 h-4" />
                  Browse Datasets
                </Link>
              )}
            </div>
          ) : (
            <>
            {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                message.sender === "user" ? "mb-6" : "",
                "flex",
                message.sender === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.sender === "user" ? (
                <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white">
                  <div className="text-sm leading-relaxed">{message.content}</div>
                </div>
              ) : message.content === "PAYMENT_REQUESTS" ? (
                <div className="max-w-[85%] space-y-2 mb-3">
                  {/* Show completed payments first */}
                  {message.queryResults && message.queryResults.map((queryResult, idx) => (
                    <div key={`completed-${idx}`} className="bg-[#0a0a0f] border border-green-500/20 rounded-xl p-3 shadow-lg">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                          <span className="text-xs text-green-400 font-medium">
                            Processed {queryResult.returned_rows} rows for {formatSOL(queryResult.cost)}
                          </span>
                        </div>
                        <Button
                          onClick={() => setViewingDataModal({
                            columns: queryResult.columns,
                            rows: queryResult.rows,
                            sql_query: queryResult.sql_query
                          })}
                          className="h-7 px-3 text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white flex-shrink-0"
                        >
                          <Database className="h-3 w-3 mr-1.5" />
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {/* Then show pending payments */}
                  {paymentRequests.length > 0 && (
                    <>
                      {paymentRequests.map((payReq, idx) => (
                    <div key={payReq.payment_details.challenge_id} className="bg-[#0a0a0f] border border-white/10 rounded-2xl p-5 shadow-xl">
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse"></div>
                          <span className="text-xs font-mono text-violet-300">x402 Payment #{idx + 1}</span>
                        </div>
                        <p className="text-sm text-white/70">Query execution requires payment</p>
                      </div>

                      {/* Currency Selector */}
                      <div className="mb-4">
                        <label className="text-xs text-white/60 mb-2 block">Payment Currency</label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedCurrency("SOL")}
                            className={cn(
                              "flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                              selectedCurrency === "SOL"
                                ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/20"
                                : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80"
                            )}
                          >
                            SOL
                          </button>
                          <button
                            onClick={() => setSelectedCurrency("USDC")}
                            className={cn(
                              "flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                              selectedCurrency === "USDC"
                                ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20"
                                : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80"
                            )}
                          >
                            USDC
                          </button>
                        </div>
                      </div>

                      {/* Payment Details */}
                      <div className="bg-white/5 rounded-lg p-4 space-y-2.5 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-white/60">Query</span>
                          <code className="text-xs text-cyan-300 font-mono max-w-[60%] truncate">{payReq.sql_query}</code>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-white/60">Rows</span>
                          <span className="text-white">{payReq.estimated_rows}</span>
                        </div>
                        <div className="border-t border-white/10 pt-2.5 mt-2.5">
                          <div className="flex justify-between items-end">
                            <span className="text-white/80 font-medium">Cost</span>
                            <div className="text-cyan-400 font-semibold">{formatCurrency(payReq.total_cost, selectedCurrency)}</div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        <Button
                          onClick={() => handlePayment(payReq)}
                          disabled={paymentProcessing.has(payReq.payment_details.challenge_id) || !publicKey}
                          className="flex-1 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 shadow-lg shadow-violet-500/20 disabled:opacity-50"
                        >
                          {paymentProcessing.has(payReq.payment_details.challenge_id) ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Processing...
                            </>
                          ) : (
                            <>
                              Pay {formatCurrency(payReq.total_cost, selectedCurrency)}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {!publicKey && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mt-2">
                      <div className="flex items-start gap-2">
                        <Wallet className="h-4 w-4 text-yellow-400 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs text-yellow-200 font-medium mb-1">Wallet Not Connected</p>
                          <p className="text-xs text-yellow-200/70 mb-2">Connect Solflare to make payments</p>
                          <WalletButton />
                        </div>
                      </div>
                    </div>
                  )}
                    </>
                  )}
                </div>
              ) : (
                <div className="max-w-[85%] text-white/80">
                  <div className="text-sm leading-relaxed [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-1 [&_strong]:font-medium [&_strong]:text-white [&_em]:italic [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:my-4 [&_h1]:text-white [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:my-3 [&_h2]:text-white [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:my-2 [&_h3]:text-white [&_p]:mb-3 [&_p]:leading-relaxed [&_code]:text-cyan-400 [&_code]:bg-white/5 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_pre]:bg-white/5 [&_pre]:border [&_pre]:border-white/10 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:my-3">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="mb-6 flex justify-start">
              <div className="flex items-center gap-2 text-white/40">
                <MessageLoading />
              </div>
            </div>
          )}
            </>
          )}
          </ChatMessageList>
        </div>

        {/* Input Area */}
        <div className="border-t border-white/5 p-4 flex-shrink-0">
          <form onSubmit={handleSubmit}>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3 focus-within:outline-none">
              <ChatInput
                ref={textareaRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleSubmit(event as any);
                  }
                }}
                placeholder={
                  selectedDatasetObjects.length > 0
                    ? "Ask about your data..."
                    : "Attach a dataset to get started..."
                }
                className="w-full min-h-[44px] max-h-[200px] resize-none border-0 bg-transparent px-1 text-white text-sm placeholder:text-white/30 focus:ring-0 focus-visible:ring-0 focus:ring-offset-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none overflow-y-auto scrollbar-hide"
                rows={1}
              />
              <div className="flex items-center justify-between mt-2">
          <div className="relative" ref={popupRef}>
            <button
              onClick={() => setShowAttachedPopup(!showAttachedPopup)}
                    type="button"
                    className="flex items-center gap-2 text-xs text-white/40 hover:text-white/60 transition-colors px-1"
            >
              <Database className="h-3 w-3 text-cyan-400" />
              <span>
                {loadingDatasets ? (
                  "Loading..."
                ) : selectedDatasetObjects.length > 0 ? (
                  `${selectedDatasetObjects.length} dataset${selectedDatasetObjects.length !== 1 ? 's' : ''} attached`
                ) : (
                  "No datasets"
                )}
              </span>
              <ChevronDown className={cn("h-3 w-3 transition-transform", showAttachedPopup && "rotate-180")} />
            </button>
            
                  {/* Attached datasets popup - appears above */}
            {showAttachedPopup && (
                    <div className="absolute bottom-full left-1 mb-2 w-72 rounded-xl border border-white/10 bg-[#0a0a0f]/95 backdrop-blur-xl p-2 shadow-xl z-50">
                {selectedDatasetObjects.length > 0 && (
                  <div className="space-y-1 mb-2">
                    <p className="text-[10px] uppercase tracking-wider text-white/30 px-3 py-1">Attached</p>
                    {selectedDatasetObjects.map((dataset) => (
                      <div
                        key={dataset.slug}
                        className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-white/[0.04] group"
                      >
                        <a
                          href={`/datasets/${dataset.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                        >
                          <Database className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                          <span className="text-sm text-white/70 truncate hover:text-white transition-colors">{dataset.name}</span>
                        </a>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveDataset(dataset.slug);
                          }}
                          className="p-1.5 rounded-md text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {datasets.length === 0 && (
                  <Link
                    href="/datasets/publish"
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/40 hover:text-white hover:bg-white/[0.04] transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Upload your first dataset
                  </Link>
                )}

                {/* Add dataset button */}
                <div className="border-t border-white/5 mt-2 pt-2">
                  <Link
                    href="/datasets"
                    className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-white/50 hover:text-white hover:bg-white/[0.04] transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Browse marketplace
                  </Link>
                </div>
              </div>
            )}
          </div>
              <Button
                type="submit"
                size="sm"
                  className="h-8 w-8 p-0 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all hover:-translate-y-0.5"
                disabled={isLoading || selectedDatasetObjects.length === 0}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Send className="h-4 w-4" />
                )}
              </Button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Data Table Modal */}
      {viewingDataModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0f] border border-white/10 rounded-2xl max-w-4xl w-full max-h-[80vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-start justify-between p-6 border-b border-white/10">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white mb-2">Query Results</h3>
                <code className="text-xs text-white/50 font-mono break-all">
                  {viewingDataModal.sql_query}
                </code>
              </div>
              <button
                onClick={() => setViewingDataModal(null)}
                className="text-white/40 hover:text-white/70 transition-colors ml-4"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Table Container */}
            <div className="flex-1 overflow-auto p-6">
              <div className="border border-white/10 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-white/5 border-b border-white/10">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                        #
                      </th>
                      {viewingDataModal.columns.map((col, idx) => (
                        <th key={idx} className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {viewingDataModal.rows.map((row, rowIdx) => (
                      <tr key={rowIdx} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 text-white/40 text-xs">
                          {rowIdx + 1}
                        </td>
                        {row.map((cell, cellIdx) => (
                          <td key={cellIdx} className="px-4 py-3 text-white/80">
                            {typeof cell === 'string' ? cell : JSON.stringify(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t border-white/10">
              <div className="text-sm text-white/50">
                Showing {viewingDataModal.rows.length} rows
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => setViewingDataModal(null)}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 text-white"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    // Convert to CSV
                    const headers = viewingDataModal.columns.join(',');
                    const rows = viewingDataModal.rows.map(row => 
                      row.map(cell => {
                        const str = typeof cell === 'string' ? cell : JSON.stringify(cell);
                        // Escape quotes and wrap in quotes if contains comma
                        return str.includes(',') || str.includes('"') || str.includes('\n') 
                          ? `"${str.replace(/"/g, '""')}"` 
                          : str;
                      }).join(',')
                    ).join('\n');
                    const csv = `${headers}\n${rows}`;
                    
                    // Download CSV
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `query-results-${Date.now()}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                  className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white"
                >
                  <Database className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AgentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="flex items-center gap-3 text-white/60">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading...</span>
          </div>
        </div>
      }
    >
      <AgentPageContent />
    </Suspense>
  );
}
