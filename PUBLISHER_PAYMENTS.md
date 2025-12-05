# Publisher Direct Payments

## Overview

Publishers now receive payments **directly to their wallets** instead of a platform wallet. This makes Quarry a truly decentralized marketplace.

## ✅ What Changed

### Backend
1. ✅ Added `publisher_wallet` field to datasets table
2. ✅ Modified x402 protocol to accept custom recipient
3. ✅ Updated payment flow to use dataset publisher's wallet
4. ✅ Fallback to platform wallet if publisher wallet not set

### Frontend
1. ✅ Added wallet input field to upload form
2. ✅ Validation for Solana wallet addresses
3. ✅ Helpful UI hints about payment destination
4. ✅ Updated TypeScript types

### Migration
1. ✅ Created migration script
2. ✅ Ran migration successfully
3. ✅ Column added to existing database

## 🔄 Payment Flow

### Old Flow (Platform Wallet)
```
User queries dataset
    ↓
Pays to PAYMENT_WALLET_ADDRESS (platform)
    ↓
Platform keeps all revenue
```

### New Flow (Publisher Wallet)
```
User queries dataset
    ↓
Pays to publisher_wallet (dataset owner)
    ↓
Publisher receives payment directly
```

## 📝 Upload Form Changes

When publishing a dataset, users now see:

```
Dataset Name *
[Input field]

Publisher *
[Input field]

Publisher Wallet * (Receives payments)
[Input field with mono font]
💡 Payments for dataset queries will be sent directly to this wallet address

Description
[Text area]
...
```

### Validation

- ✅ Wallet address required
- ✅ Must be 32-44 characters (Solana address length)
- ✅ Shown in monospace font for clarity
- ✅ Clear explanation of purpose

## 🔐 How It Works

### 1. Publisher Uploads Dataset

```typescript
// Frontend
formData.append("publisher_wallet", "7xKxD...abc123");

// Backend receives and stores
dataset.publisher_wallet = "7xKxD...abc123"
```

### 2. User Queries Dataset

```python
# Backend agent.py
dataset = db.get_dataset_by_slug(slug)
publisher_wallet = dataset.publisher_wallet

# Create payment request with publisher's wallet
payment_request = x402.create_payment_request(
    amount_sol=total_cost,
    resource_id=resource_id,
    description=description,
    recipient_wallet=publisher_wallet  # ← Publisher gets paid
)
```

### 3. Payment Sent

```typescript
// Frontend
const transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: userWallet,
    toPubkey: publisherWallet,  // ← Direct to publisher
    lamports: amount,
  })
);
```

### 4. Publisher Receives SOL

Payment goes directly to publisher's wallet - no intermediary!

## 🎯 Benefits

### For Publishers
- ✅ **Instant payments** - No platform escrow
- ✅ **Full control** - Your wallet, your funds
- ✅ **Transparent** - See payments on Solana explorer
- ✅ **No fees** - Keep 100% of revenue

### For Users
- ✅ **Support creators** - Pay publishers directly
- ✅ **Transparent** - See where money goes
- ✅ **Verifiable** - Check transactions on-chain

### For Platform
- ✅ **Truly decentralized** - No custody of funds
- ✅ **Lower liability** - Not handling money
- ✅ **Web3 native** - Peer-to-peer marketplace
- ✅ **Hackathon appeal** - Shows real decentralization

## 🔧 Fallback Mechanism

If a publisher doesn't set a wallet:

```python
publisher_wallet = dataset.publisher_wallet
if not publisher_wallet:
    # Fallback to platform wallet
    publisher_wallet = settings.payment_wallet_address
```

This ensures:
- Old datasets still work
- Platform can still test
- Gradual migration possible

## 🚀 Testing

### 1. Upload New Dataset

1. Go to http://localhost:3000/datasets/publish
2. Fill in form including **Publisher Wallet**
3. Upload dataset
4. Dataset stored with wallet address

### 2. Query Dataset

1. Go to agent
2. Attach dataset
3. Query data
4. Payment request shows publisher's wallet as recipient
5. Pay transaction
6. **Publisher receives SOL directly!**

### 3. Verify Payment

```bash
# Check Solana explorer
https://explorer.solana.com/tx/{transaction_signature}

# You'll see:
# From: User wallet
# To: Publisher wallet  ← Direct payment!
# Amount: Query cost
```

## 📊 Revenue Model Options

### Option 1: Pure P2P (Current)
- Publishers set their own prices
- Publishers receive 100% of payments
- Platform takes no cut
- Most decentralized

### Option 2: Platform Fee (Future)
```python
# Split payment
publisher_amount = total_cost * 0.95  # 95% to publisher
platform_amount = total_cost * 0.05   # 5% platform fee

# Create multi-instruction transaction
transaction.add(
    transfer(user → publisher, publisher_amount),
    transfer(user → platform, platform_amount)
)
```

### Option 3: Subscription (Future)
- Publishers pay monthly platform fee
- Keep 100% of query revenue
- Tiered pricing

## 🔍 Database Schema

```sql
CREATE TABLE datasets (
    ...
    publisher VARCHAR NOT NULL,
    publisher_wallet VARCHAR,  -- ← New field
    ...
)
```

## 🎨 UI Updates

### Upload Form
- New field: "Publisher Wallet"
- Marked as required (*)
- Helpful hint about payments
- Monospace font for address
- Validation on submit

### Dataset Display
- Publisher wallet stored but not displayed publicly
- Used internally for payment routing
- Could add "Verified Publisher" badge if wallet verified

## 🔐 Security Considerations

### Wallet Validation
```python
# Basic length check
if len(wallet) < 32 or len(wallet) > 44:
    raise ValueError("Invalid Solana address")
```

### Best Practices
- ✅ Publishers should use dedicated wallets
- ✅ Not their main wallet (for privacy)
- ✅ Can change wallet later (update endpoint)
- ✅ Verify ownership (future: sign message)

## 📋 Migration

Run this to add column to existing databases:

```bash
cd /Users/vamp/Documents/quarry-ai
./quarry-backend/venv/bin/python3 scripts/migrate_add_publisher_wallet.py
```

## 🎉 Result

Your marketplace is now **truly decentralized**:

- ✅ No platform custody of funds
- ✅ Direct peer-to-peer payments
- ✅ Publishers control their revenue
- ✅ Transparent on-chain transactions
- ✅ Web3-native architecture

## 🚀 Next Steps

1. **Restart backend** to pick up changes
2. **Upload a test dataset** with your wallet
3. **Query it** and see payment go to your wallet!
4. **Check Solana explorer** to verify

---

**Status**: ✅ Complete and ready to test  
**Migration**: ✅ Database updated  
**Decentralization**: 💯 Maximum  

**You now have a fully peer-to-peer data marketplace!** 🎉

