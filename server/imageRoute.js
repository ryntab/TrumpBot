import express from 'express';
import sharp from 'sharp';
import fs from 'fs/promises'; // for reading local image

const router = express.Router();

const baseWidth = 600;
const baseHeight = 60;

const backgroundBuffer = await fs.readFile('assets/Discord-Trump-Decoration-Alt.png');

// Load and resize the banner
const banner = await sharp(backgroundBuffer)
    .resize(600, 30)
    .png()
    .toBuffer();

async function fetchNasdaqStock(symbol, type) {
    try {
        const url = `https://api.nasdaq.com/api/quote/${symbol}/info?assetclass=${type}`;
        console.log(`Fetching data from: ${url}`);
        const res = await fetch(url);
        const response = await res.json();

        const data = response.data.primaryData;
        console.log(data);

        return {
            symbol,
            price: data.lastSalePrice.replace('$', ''),
            percentageChange: data.percentageChange, // ← Add this
            change: parseFloat(data.netChange),
            direction: data.deltaIndicator.toLowerCase() // 'up' or 'down'
        };
    } catch (err) {
        console.error(`Failed to fetch ${symbol}:`, err.message);
        return null;
    }
}

export function generateStockBadge({ x, label, price, percentageChange, direction, color }) {
    const arrow = direction === 'up'
        ? `<polygon points="${x + 15},27 ${x + 20},17 ${x + 25},27" fill="${color}"/>`
        : `<polygon points="${x + 15},17 ${x + 20},27 ${x + 25},17" fill="${color}"/>`;

    return `
      <rect x="${x}" y="10" rx="8" ry="8" width="110" height="20" fill="${color}" fill-opacity="0.2"/>
      ${arrow}
      <text x="${x + 64}" y="21" text-anchor="middle" dominant-baseline="middle" fill="${color}" font-size="12" font-family="Arial">
        <tspan font-weight="bold">${label}:</tspan> ${percentageChange}
      </text>
    `;
}

export function generateOverlaySVG(tickers = []) {
    const svgParts = tickers.map((ticker, index) => {
        const x = 0 + index * 120;
        return generateStockBadge({
            x,
            label: ticker.symbol,
            price: ticker.price,
            percentageChange: ticker.percentageChange,
            direction: ticker.change >= 0 ? 'up' : 'down',
            color: ticker.change >= 0 ? '#28a745' : '#dc3545'
        });
    });

    return `
      <svg width="600" height="50" xmlns="http://www.w3.org/2000/svg">
        ${svgParts.join('\n')}
      </svg>
    `;
}

router.get('/generate', async (req, res) => {
    try {
        const [djt, tesla, qqq, spy, dia] = await Promise.all([
            fetchNasdaqStock('DJT', 'stocks'),
            fetchNasdaqStock('TSLA', 'stocks'),
            fetchNasdaqStock('QQQ', 'etf'),
            fetchNasdaqStock('SPY', 'etf'),
            fetchNasdaqStock('DIA', 'etf'),
        ]);

        const svgOverlay = generateOverlaySVG([djt, tesla, qqq, spy, dia]); // Skip DJT if you want
        const finalImage = await sharp({
            create: {
                width: baseWidth,
                height: baseHeight,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            },
        })
            .composite([
                { input: banner, top: 0, left: 0 },
                { input: Buffer.from(svgOverlay), top: 28, left: 3 }
            ])
            .png()
            .toBuffer();

        res.set('Content-Type', 'image/png');
        res.send(finalImage);
    } catch (err) {
        console.error('Error generating image:', err.message);
        res.status(500).send('Error generating image');
    }
});


export default router;
