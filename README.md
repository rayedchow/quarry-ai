# Quarry - Complete Setup Guide

Welcome to Quarry! This guide will get you up and running with the full system including IPFS, SAS reputation, on-chain reviews, and direct publisher payments.

## 🚀 Quick Start (5 Minutes)

### 1. Install Backend Dependencies

```bash
cd /Users/vamp/Documents/quarry-ai/quarry-backend
pip install -r requirements.txt
```

This installs:
- FastAPI, DuckDB, Pandas (core)
- Solana, Solders (blockchain)
- IPFS client (reputation)
- AnchorPy (SAS integration)

### 2. Install Frontend Dependencies

```bash
cd /Users/vamp/Documents/quarry-ai/quarry-app
yarn install
```

This installs React, Next.js, Solana wallet adapter, and UI components.

### 3. Generate SAS Authority Keypair

```bash
cd /Users/vamp/Documents/quarry-ai
./quarry-backend/venv/bin/python3 scripts/generate_sas_keypair.py
```

Copy the `SAS_AUTHORITY_KEY` from the output.

### 4. Configure Environment

Create `/Users/vamp/Documents/quarry-ai/quarry-backend/.env`:

```env
# OpenAI (for agent)
OPENAI_API_KEY=your_openai_api_key_here

# Solana
SOLANA_RPC_URL=https://api.devnet.solana.com
PAYMENT_WALLET_ADDRESS=your_wallet_address_here

# SAS (Reputation)
SAS_AUTHORITY_KEY=<paste_from_step_3>

# IPFS (optional - will simulate if not available)
IPFS_API=/ip4/127.0.0.1/tcp/5001
```

### 5. Initialize Database

```bash
cd /Users/vamp/Documents/quarry-ai
./quarry-backend/venv/bin/python3 scripts/reset_data.py --force
```

This creates all tables with the latest schema:
- `datasets` (with reputation_data, publisher_wallet)
- `reviews` (on-chain reviews)
- `review_helpful_votes` (anti-spam)

### 6. Start Services

**Terminal 1 - Backend:**
```bash
cd /Users/vamp/Documents/quarry-ai/quarry-backend
source venv/bin/activate
python main.py
```

**Terminal 2 - Frontend:**
```bash
cd /Users/vamp/Documents/quarry-ai/quarry-app
yarn dev
```

### 7. Test It!

1. Go to http://localhost:3000
2. Upload a dataset
3. See reputation automatically generated!

## 📚 Complete Feature List

### ✅ Core Marketplace
- Dataset upload (CSV, JSON, SQL)
- DuckDB storage & querying
- AI agent for data analysis
- x402 micropayments

### ✅ IPFS + SAS Reputation
- Automated QA checks (6 dimensions)
- Quality scoring (0-100)
- IPFS report storage
- Solana attestations
- Reputation badges
- Beautiful UI display

### ✅ On-Chain Reviews
- Usage receipt verification
- Review attestations on Solana
- Review text on IPFS
- Anti-sybil protection
- Weighted scoring
- Helpful votes

### ✅ Publisher Direct Payments
- Publishers set their wallet
- Payments go directly to publishers
- No platform custody
- Truly decentralized

## 🗂️ Database Schema

The reset script creates:

### Datasets Table
```sql
CREATE TABLE datasets (
    id VARCHAR PRIMARY KEY,
    slug VARCHAR UNIQUE NOT NULL,
    name VARCHAR NOT NULL,
    publisher VARCHAR NOT NULL,
    publisher_wallet VARCHAR,          -- NEW: For direct payments
    tags JSON,
    description TEXT,
    summary TEXT,
    price_per_row DOUBLE DEFAULT 0.001,
    row_count BIGINT DEFAULT 0,
    column_count INTEGER DEFAULT 0,
    update_frequency VARCHAR DEFAULT 'static',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    schema_columns JSON,
    parquet_path VARCHAR,
    original_filename VARCHAR,
    reputation_data JSON               -- NEW: For reputation storage
)
```

### Reviews Table
```sql
CREATE TABLE reviews (
    id VARCHAR PRIMARY KEY,
    dataset_id VARCHAR NOT NULL,
    dataset_version VARCHAR DEFAULT 'v1',
    reviewer_wallet VARCHAR NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT NOT NULL,
    review_text_cid VARCHAR NOT NULL,
    usage_receipt_attestation VARCHAR NOT NULL,
    review_attestation_id VARCHAR NOT NULL,
    review_attestation_address VARCHAR NOT NULL,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dataset_id) REFERENCES datasets(id)
)
```

### Review Helpful Votes Table
```sql
CREATE TABLE review_helpful_votes (
    review_id VARCHAR NOT NULL,
    voter_wallet VARCHAR NOT NULL,
    voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (review_id, voter_wallet),
    FOREIGN KEY (review_id) REFERENCES reviews(id)
)
```

## 🔧 Scripts Available

### `reset_data.py`
**Complete database reset with latest schema**

```bash
./quarry-backend/venv/bin/python3 scripts/reset_data.py --force
```

Creates:
- datasets table (with reputation_data, publisher_wallet)
- reviews table
- review_helpful_votes table
- All indexes

### `migrate_add_reputation.py`
**Add reputation_data column to existing database**

```bash
./quarry-backend/venv/bin/python3 scripts/migrate_add_reputation.py
```

### `migrate_add_publisher_wallet.py`
**Add publisher_wallet column to existing database**

```bash
./quarry-backend/venv/bin/python3 scripts/migrate_add_publisher_wallet.py
```

### `generate_sas_keypair.py`
**Generate SAS authority keypair**

```bash
./quarry-backend/venv/bin/python3 scripts/generate_sas_keypair.py
```

### `test_reputation.py`
**Test the reputation system**

```bash
./quarry-backend/venv/bin/python3 scripts/test_reputation.py
```

## 🎯 Testing the Complete System

### Test 1: Upload & Reputation

1. Upload a dataset at http://localhost:3000/datasets/publish
2. Fill in all fields including **Publisher Wallet**
3. Upload file
4. View dataset page - see:
   - ✅ Quality score (0-100)
   - ✅ Reputation badges
   - ✅ QA check summaries
   - ✅ On-chain attestations

### Test 2: Query & Payment

1. Go to agent at http://localhost:3000/agent
2. Attach a dataset
3. Ask a question requiring data
4. Pay the transaction
5. Verify payment went to **publisher's wallet** (not platform)
6. Usage receipt created automatically

### Test 3: Write Review

1. After querying a dataset, go to its page
2. See "Write Verified Review" button (if wallet connected)
3. Write review and rate
4. Submit - goes on-chain!
5. See review appear with "Verified Purchaser" badge

## 📡 API Endpoints

### Datasets
```
GET    /api/datasets
POST   /api/datasets
GET    /api/datasets/{slug}
POST   /api/datasets/{slug}/query
```

### Reputation
```
POST   /api/reputation/process
GET    /api/reputation/dataset/{id}
GET    /api/reputation/ipfs/{cid}
GET    /api/reputation/schemas
GET    /api/reputation/health
```

### Reviews
```
POST   /api/reviews
GET    /api/reviews/dataset/{id}
POST   /api/reviews/helpful
GET    /api/reviews/check-eligibility/{dataset_id}/{wallet}
```

### Agent
```
POST   /api/agent/chat (streaming)
POST   /api/agent/confirm-payment
```

## 🔍 Health Checks

### Backend
```bash
curl http://localhost:8000/health
curl http://localhost:8000/api/reputation/health
```

### Database
```bash
cd quarry-backend
./venv/bin/python3 -c "
from database import db
datasets = db.list_datasets(10, 0)[0]
print(f'Datasets: {len(datasets)}')
for d in datasets:
    print(f'  - {d.name}: reputation={d.reputation_data is not None}')
"
```

## 🎨 What Users See

### Dataset Page
1. **Title & Description** - With stats card on right
2. **Quality & Trust** - Quality score + reputation panel (full-width)
3. **Data Structure** - Schema with semantics
4. **User Reviews** - On-chain verified reviews
5. **Data Preview** - Scrollable table

### Features Per Section

**Quality & Trust:**
- Quality score (0-100) with color coding
- Reputation badges (⭐ Excellent, 🔒 PII Safe, etc.)
- QA check summaries
- On-chain attestation details
- IPFS report viewer

**User Reviews:**
- Average rating (stars + numeric)
- Individual reviews with verified badges
- Write review button (if eligible)
- Helpful votes
- IPFS links

## 🔐 Security Features

### Reputation
- ✅ Cryptographically signed attestations
- ✅ Immutable IPFS storage
- ✅ Time-bounded trust (expiry)
- ✅ Verifiable by anyone

### Reviews
- ✅ Must purchase to review
- ✅ One review per wallet
- ✅ Weighted by usage
- ✅ Community validation (helpful votes)

### Payments
- ✅ Direct publisher payments
- ✅ No platform custody
- ✅ On-chain verification
- ✅ x402 protocol compliant

## 📊 Data Flow

### Upload Flow
```
Upload → Parquet → QA Checks → IPFS → SAS → Database → Display
```

### Query Flow
```
Query → Payment (to publisher) → Receipt → Results → Can Review
```

### Review Flow
```
Write → Verify Receipt → IPFS → SAS → Database → Display
```

## 🎓 Architecture Decisions

### Why IPFS + SAS?
- **IPFS**: Large, human-readable evidence
- **SAS**: Small, verifiable claims
- **Database**: Fast queries, caching
- **Best of all worlds**

### Why Usage Receipts?
- **Proves purchase** without trust
- **On-chain verification** (can't fake)
- **Enables verified reviews** (anti-sybil)
- **Permanent proof** (never expires)

### Why Direct Publisher Payments?
- **True decentralization** (no intermediary)
- **Lower liability** (no custody)
- **Publisher control** (their money, their rules)
- **Web3 native** (peer-to-peer)

## 🚨 Troubleshooting

### "No reputation showing"
- Restart backend
- Upload NEW dataset
- Check logs for errors
- Run: `scripts/migrate_add_reputation.py`

### "IPFS errors"
- Expected in simulation mode
- Reports still generated
- Set up real IPFS for production

### "Review button not showing"
- Must query dataset first
- Check usage receipt created
- Connect wallet

### "Payment fails"
- Check wallet has SOL
- Verify publisher_wallet set
- Check transaction logs

## 📋 Fresh Install Checklist

- [ ] Clone repository
- [ ] Install Python dependencies
- [ ] Install Node dependencies
- [ ] Generate SAS keypair
- [ ] Configure .env file
- [ ] Run reset_data.py --force
- [ ] Start backend
- [ ] Start frontend
- [ ] Upload test dataset
- [ ] Query dataset
- [ ] Write review
- [ ] ✅ Everything works!

## 🎉 What You Built

A **world-class data marketplace** with:

- ✅ Automated quality scoring
- ✅ On-chain attestations (SAS)
- ✅ IPFS evidence storage
- ✅ Verifiable reviews
- ✅ Anti-sybil protection
- ✅ Direct publisher payments
- ✅ Usage receipt system
- ✅ Weighted reputation
- ✅ Beautiful UI
- ✅ Complete documentation

## 📞 Quick Reference

| Task | Command |
|------|---------|
| Reset DB | `./quarry-backend/venv/bin/python3 scripts/reset_data.py --force` |
| Generate Key | `./quarry-backend/venv/bin/python3 scripts/generate_sas_keypair.py` |
| Test Rep | `./quarry-backend/venv/bin/python3 scripts/test_reputation.py` |
| Start Backend | `cd quarry-backend && python main.py` |
| Start Frontend | `cd quarry-app && yarn dev` |

## 📖 Documentation

- **PUBLISHER_PAYMENTS.md** - Direct payment system
- **ON_CHAIN_REVIEWS.md** - Review system (if exists)
- **REPUTATION_STATUS.md** - Reputation overview (if exists)
- **ONBOARDING.md** - This file

---

**Status**: ✅ Production-ready after configuration  
**Time to setup**: ~5 minutes  
**Time to first dataset**: ~2 minutes  
**Time to first review**: ~5 minutes after usage  

**Welcome to the future of decentralized data marketplaces!** 🚀

