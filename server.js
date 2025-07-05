const express = require('express');
const path = require('path');
const fs = require('fs');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from public directory
app.use('/public', express.static(path.join(__dirname, 'public')));

// Read custom CSS and JS files
const customCSS = fs.readFileSync(path.join(__dirname, 'public', 'custom.css'), 'utf8');
const customJS = fs.readFileSync(path.join(__dirname, 'public', 'custom.js'), 'utf8');

// Function to inject custom assets into HTML
function injectCustomAssets(html) {
  // Inject CSS before closing head tag
  const cssInjection = `<style>${customCSS}</style>\n</head>`;
  html = html.replace(/<\/head>/i, cssInjection);
  
  // Inject JS before closing body tag
  const jsInjection = `<script>${customJS}</script>\n</body>`;
  html = html.replace(/<\/body>/i, jsInjection);
  
  return html;
}

// Function to make a proxy request and handle redirects internally
function makeProxyRequest(targetPath, req, res, maxRedirects = 5) {
  if (maxRedirects <= 0) {
    res.status(508).send('Too many redirects');
    return;
  }

  const options = {
    hostname: 'barbarian.men',
    port: 443,
    path: targetPath,
    method: req.method,
    headers: {
      ...req.headers,
      'host': 'barbarian.men',
      'referer': 'https://barbarian.men/macaw45',
      'user-agent': req.headers['user-agent'] || 'Mozilla/5.0 (compatible; barbarian-proxy)',
      'accept-encoding': 'identity'
    }
  };

  const proxyReq = https.request(options, (proxyRes) => {
    const contentType = proxyRes.headers['content-type'] || '';
    
    console.log(`${req.method} ${targetPath} -> ${proxyRes.statusCode}`);
    
    // Handle redirects internally
    if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400) {
      const location = proxyRes.headers.location;
      if (location) {
        let redirectPath;
        
        if (location.startsWith('/')) {
          redirectPath = location;
        } else if (location.startsWith('https://barbarian.men')) {
          redirectPath = location.replace('https://barbarian.men', '');
        } else {
          // External redirect - pass through to browser
          res.statusCode = proxyRes.statusCode;
          Object.keys(proxyRes.headers).forEach(key => {
            res.setHeader(key, proxyRes.headers[key]);
          });
          res.end();
          return;
        }
        
        console.log(`Redirecting internally: ${targetPath} -> ${redirectPath}`);
        makeProxyRequest(redirectPath, req, res, maxRedirects - 1);
        return;
      }
    }
    
    // Not a redirect - handle the response
    res.statusCode = proxyRes.statusCode;
    
    // Copy headers from the proxy response
    Object.keys(proxyRes.headers).forEach(key => {
      if (contentType.includes('text/html') && key.toLowerCase() === 'content-length') {
        return;
      }
      res.setHeader(key, proxyRes.headers[key]);
    });
    
    // Handle HTML responses with asset injection
    if (contentType.includes('text/html')) {
      let body = '';
      
      proxyRes.setEncoding('utf8');
      proxyRes.on('data', (chunk) => {
        body += chunk;
      });
      
      proxyRes.on('end', () => {
        try {
          const modifiedBody = injectCustomAssets(body);
          res.end(modifiedBody);
        } catch (error) {
          console.error('Error injecting assets:', error);
          res.end(body);
        }
      });
      
    } else {
      proxyRes.pipe(res);
    }
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy request error:', err);
    if (!res.headersSent) {
      res.status(500).send('Proxy error occurred');
    }
  });

  proxyReq.setTimeout(30000, () => {
    console.error('Proxy request timeout');
    if (!res.headersSent) {
      res.status(504).send('Gateway timeout');
    }
    proxyReq.destroy();
  });

  if (req.method === 'POST' || req.method === 'PUT') {
    req.pipe(proxyReq);
  } else {
    proxyReq.end();
  }
}

// Handle root with a simple redirect
app.get('/', (req, res) => {
  res.redirect('/macaw45/');
});

// Handle all other routes - everything gets /macaw45 prefix except paths that already have it
app.use('*', (req, res) => {
  let targetPath;
  
  if (req.originalUrl.startsWith('/macaw45')) {
    // Already has /macaw45, use as-is
    targetPath = req.originalUrl;
  } else {
    // Add /macaw45 prefix to everything else
    targetPath = '/macaw45' + req.originalUrl;
  }
  
  console.log(`Proxying: localhost:${PORT}${req.originalUrl} -> https://barbarian.men${targetPath}`);
  makeProxyRequest(targetPath, req, res);
});

// Start server
app.listen(PORT, () => {
  console.log(`Barbarian proxy server running on http://localhost:${PORT}`);
  console.log(`All requests will be proxied to https://barbarian.men/macaw45/* with custom CSS and JS injected`);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  process.exit(0);
});