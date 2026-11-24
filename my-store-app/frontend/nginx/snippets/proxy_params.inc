proxy_http_version 1.1;
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $fwd_proto;
proxy_set_header X-Request-Id $request_id;
proxy_set_header Connection "";
# Nginx đã thêm các header bảo mật này → bỏ bản trùng do helmet (backend) gửi về
proxy_hide_header X-Content-Type-Options;
proxy_hide_header X-Frame-Options;
proxy_hide_header Referrer-Policy;
proxy_hide_header Cross-Origin-Opener-Policy;
proxy_hide_header Content-Security-Policy;
proxy_connect_timeout 5s;
proxy_read_timeout 30s;
proxy_send_timeout 30s;
proxy_next_upstream error timeout http_502 http_503;
proxy_next_upstream_tries 2;
