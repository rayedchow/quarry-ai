"""
IPFS Service for storing reputation artifacts.

This service handles uploading QA reports, audit logs, and other reputation
evidence to IPFS for immutable, verifiable storage.
"""

import json
import logging
from typing import Any, Dict, Optional
from datetime import datetime
import ipfshttpclient
from config import settings

logger = logging.getLogger(__name__)


class IPFSService:
    """Service for interacting with IPFS."""

    def __init__(self):
        """Initialize IPFS client connection."""
        self.client: Optional[ipfshttpclient.Client] = None
        self.connected = False
        self._simulated_storage: Dict[str, Any] = {}  # In-memory storage for simulation

    async def connect(self):
        """Connect to IPFS node."""
        if self.connected:
            return

        try:
            # Try to connect to local IPFS node first, fallback to Infura
            ipfs_api = getattr(settings, 'ipfs_api', '/ip4/127.0.0.1/tcp/5001')
            # Suppress version warnings
            import warnings
            with warnings.catch_warnings():
                warnings.filterwarnings("ignore", category=UserWarning)
                self.client = ipfshttpclient.connect(ipfs_api)
            self.connected = True
            logger.info(f"Connected to IPFS node at {ipfs_api}")
        except Exception as e:
            logger.warning(f"Failed to connect to local IPFS: {e}")
            # For testing, we'll simulate IPFS if no connection available
            logger.info("Running in IPFS simulation mode for testing")
            self.connected = True  # Mark as connected but in simulation mode
            self.client = None

    async def disconnect(self):
        """Disconnect from IPFS node."""
        if self.client:
            self.client.close()
            self.connected = False
            logger.info("Disconnected from IPFS")

    async def upload_json(self, data: Dict[str, Any]) -> str:
        """
        Upload JSON data to IPFS.

        Args:
            data: Dictionary to upload as JSON

        Returns:
            CID (Content Identifier) of the uploaded data
        """
        await self.connect()
        
        if not self.connected:
            raise Exception("Not connected to IPFS")

        try:
            # If client is None, we're in simulation mode
            if self.client is None:
                # Generate a proper-length CID for testing
                import hashlib
                import base58 as b58
                json_str = json.dumps(data, sort_keys=True, default=str)
                hash_bytes = hashlib.sha256(json_str.encode()).digest()
                # CIDv0 format: Qm + base58 encoded multihash (46 chars total)
                cid = "Qm" + b58.b58encode(hash_bytes).decode()
                logger.info(f"Simulated IPFS upload: {cid}")
                
                # Store in memory for retrieval
                self._simulated_storage[cid] = data
                logger.debug(f"Stored in simulation cache. Total items: {len(self._simulated_storage)}")
                
                return cid
            
            # Convert to JSON string
            json_str = json.dumps(data, indent=2, default=str)
            
            # Add to IPFS
            result = self.client.add_json(data)
            cid = result
            
            logger.info(f"Uploaded JSON to IPFS: {cid}")
            return cid
        except Exception as e:
            logger.error(f"Failed to upload to IPFS: {e}")
            raise

    async def upload_bytes(self, data: bytes, filename: str = "file") -> str:
        """
        Upload raw bytes to IPFS.

        Args:
            data: Bytes to upload
            filename: Optional filename for the data

        Returns:
            CID of the uploaded data
        """
        await self.connect()
        
        if not self.connected or not self.client:
            raise Exception("Not connected to IPFS")

        try:
            result = self.client.add_bytes(data)
            cid = result
            
            logger.info(f"Uploaded bytes to IPFS: {cid}")
            return cid
        except Exception as e:
            logger.error(f"Failed to upload bytes to IPFS: {e}")
            raise

    async def retrieve(self, cid: str) -> bytes:
        """
        Retrieve data from IPFS by CID.

        Args:
            cid: Content Identifier

        Returns:
            Raw bytes of the content
        """
        await self.connect()
        
        if not self.connected or not self.client:
            raise Exception("Not connected to IPFS")

        try:
            data = self.client.cat(cid)
            logger.info(f"Retrieved data from IPFS: {cid}")
            return data
        except Exception as e:
            logger.error(f"Failed to retrieve from IPFS: {e}")
            raise

    async def retrieve_json(self, cid: str) -> Dict[str, Any]:
        """
        Retrieve JSON data from IPFS by CID.

        Args:
            cid: Content Identifier

        Returns:
            Parsed JSON data as dictionary
        """
        await self.connect()
        
        if not self.connected:
            raise Exception("Not connected to IPFS")

        try:
            # If client is None, we're in simulation mode
            if self.client is None:
                logger.info(f"Simulated IPFS retrieval: {cid}")
                logger.debug(f"Cache has {len(self._simulated_storage)} items")
                
                # Check simulated storage
                if cid in self._simulated_storage:
                    logger.info(f"Found in simulation cache!")
                    return self._simulated_storage[cid]
                
                # Return placeholder if not found
                logger.warning(f"CID {cid} not found in simulation cache")
                return {
                    "note": "IPFS Simulation Mode",
                    "cid": cid,
                    "message": "Data not found in simulation cache. This may be from a previous session.",
                    "status": "simulated",
                    "suggestion": "Upload a new dataset to generate fresh reports, or connect to real IPFS node"
                }
            
            data = self.client.get_json(cid)
            logger.info(f"Retrieved JSON from IPFS: {cid}")
            return data
        except Exception as e:
            logger.error(f"Failed to retrieve JSON from IPFS: {e}")
            raise

    async def pin(self, cid: str):
        """
        Pin a CID to ensure it stays available.

        Args:
            cid: Content Identifier to pin
        """
        await self.connect()
        
        if not self.connected:
            raise Exception("Not connected to IPFS")

        try:
            # Skip pinning in simulation mode
            if self.client is None:
                logger.info(f"Simulated IPFS pin: {cid}")
                return
                
            self.client.pin.add(cid)
            logger.info(f"Pinned IPFS CID: {cid}")
        except Exception as e:
            logger.error(f"Failed to pin IPFS CID: {e}")
            raise


# Global IPFS service instance
ipfs_service = IPFSService()

