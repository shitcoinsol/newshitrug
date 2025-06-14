
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  const tokenAddress = event.queryStringParameters.tokenAddress;

  // Solscan API 호출하여 token 정보 가져오기 (mint 주소와 createdOn)
  const solscanApiUrl = `https://pro-api.solscan.io/v2.0/token/meta?address=${tokenAddress}`;
  try {
    const res = await fetch(solscanApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.SOLSCAN_API_KEY}`  // 환경 변수로 API 키 사용
      }
    });

    if (!res.ok) {
      throw new Error('Failed to fetch data from Solscan');
    }

    const data = await res.json();
    const createdOn = data.data.createdOn;  // createdOn 값을 통해 플랫폼 확인
    const mintAddress = data.data.mint;    // mint 주소

    // Pump.fun에서 만든 토큰인지 확인
    let price;
    if (createdOn === 'Pump.fun') {
      // Pump.fun에서 만든 토큰이라면 가격을 Moralis API로 가져오기
      const moralisPriceUrl = `https://api.moralis.io/pumpfun/price?mint=${mintAddress}`;
      const priceRes = await fetch(moralisPriceUrl, {
        method: 'GET',
        headers: {
          'X-API-Key': process.env.MORALIS_API_KEY  // 환경 변수로 API 키 사용
        }
      });
      const priceData = await priceRes.json();
      price = priceData.price;
    } else {
      // 그렇지 않으면 Dex Screener API로 가격 조회
      const dexScreenerUrl = `https://api.dexscreener.com/latest/dex/tokens/${mintAddress}`;
      const priceRes = await fetch(dexScreenerUrl);
      const priceData = await priceRes.json();
      price = priceData.price;
    }

    // Helius API를 사용하여 Dev Wallet의 트랜잭션 내역을 추적 (리스크 분석용)
    const heliusApiUrl = `https://api.helius.xyz/v1/transactions?mint=${mintAddress}`;
    const heliusRes = await fetch(heliusApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.HELIUS_API_KEY}`  // 환경 변수로 Helius API 키 사용
      }
    });

    const heliusData = await heliusRes.json();
    const devWalletActivity = heliusData.data;  // 리스크 분석에 필요한 데이터

    // 응답 반환
    return {
      statusCode: 200,
      body: JSON.stringify({
        tokenAddress,
        price,
        createdOn,
        devWalletActivity  // Dev Wallet 활동 정보 반환
      }),
      headers: {
        "Access-Control-Allow-Origin": "*",  // CORS 허용
        "Content-Type": "application/json"
      }
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
      headers: {
        "Access-Control-Allow-Origin": "*",  // CORS 허용
        "Content-Type": "application/json"
      }
    };
  }
};
