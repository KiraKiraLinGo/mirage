const http = require('http');
const httpProxy = require('http-proxy');
require('dotenv').config();

const PORT = 8080;
const PROXY_PASSWORD = process.env.PROXY_PASSWORD || 'Secret';

// プロキシインスタンスの作成（プロレベルの最適化設定）
const proxy = httpProxy.createProxyServer({
    target: 'http://localhost', // ダミー設定（リクエストごとに動的変更するため）
    ignorePath: true,
    changeOrigin: true,
    autoRewrite: true,
    ws: true // WebSocket対応
});

// エラーハンドリング（サーバーを絶対に落とさないプロの処理）
proxy.on('error', (err, req, res) => {
    console.error('Proxy Error:', err.message);
    if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
    }
    res.end('Bad Gateway: Proxy restriction or destination unreachable.');
});

// プロキシサーバーの起動
const server = http.createServer((req, res) => {
    // 1. セキュリティチェック：認証ヘッダーの確認
    const auth = req.headers['authorization'];
    if (!auth) {
        return rejectRequest(res);
    }

    const tmp = auth.split(' ');
    const buf = Buffer.from(tmp[1], 'base64');
    const plainAuth = buf.toString();
    const [creds, password] = plainAuth.split(':');

    // パスワードが一致しない場合は即ブロック
    if (password !== PROXY_PASSWORD) {
        return rejectRequest(res);
    }

    // 2. 動的なターゲットURLの解析
    // リクエストのURLから接続先（例: http://example.com -> example.com）を抽出
    let targetUrl;
    try {
        if (req.url.startsWith('http://') || req.url.startsWith('https://')) {
            targetUrl = new URL(req.url);
        } else {
            targetUrl = new URL('http://' + req.headers.host + req.url);
        }
    } catch (e) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        return res.end('Invalid URL');
    }

    // 3. プロキシとしてのヘッダー偽装・最適化
    req.headers['host'] = targetUrl.host;
    
    // 発信元IPを隠蔽（最強の匿名性）
    delete req.headers['x-forwarded-for'];
    delete req.headers['x-forwarded-proto'];

    // 4. 転送実行
    const targetOrigin = `${targetUrl.protocol}//${targetUrl.host}`;
    proxy.web(req, res, { target: targetOrigin, toProxy: true });
});

// 認証拒否の関数
function rejectRequest(res) {
    res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Secure Ultimate Proxy"' });
    res.end('Access Denied: Authentication Required.');
}

// サーバー開始ログ
server.listen(PORT, () => {
    console.log(`🚀 Perfect Proxy Server is running on port ${PORT}`);
    console.log(`🔒 Security Status: ACTIVE (Password Protected)`);
});
