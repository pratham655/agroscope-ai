import asyncio
import sys
sys.path.insert(0, ".")
import httpx
from app.main import app

async def main():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get("/api/health")
        print("Status:", r.status_code)
        print("Response:", r.json())

if __name__ == "__main__":
    asyncio.run(main())
