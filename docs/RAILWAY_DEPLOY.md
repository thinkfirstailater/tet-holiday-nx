# Hướng dẫn Deploy lên Railway

Dự án này là Monorepo (Nx) bao gồm Backend (NestJS) và Frontend (React). Bạn có thể deploy cả hai lên Railway dễ dàng bằng cách tạo 2 Service riêng biệt từ cùng một Repository.

## 1. Chuẩn bị

Đảm bảo code của bạn đã được push lên GitHub.

## 2. Deploy Backend API

1.  Trên Railway, chọn **New Project** -> **Deploy from GitHub repo**.
2.  Chọn repository của dự án này.
3.  Sau khi project được tạo, vào **Settings** của Service vừa tạo:
    *   **Root Directory**: `/` (Để mặc định hoặc nhập `/` để Docker có thể access toàn bộ monorepo).
    *   **DockerfilePath**: `apps/backend-api/Dockerfile`
    *   **Watch Paths** (Optional): `apps/backend-api/**`
4.  Vào tab **Variables**, thêm các biến môi trường:
    *   `PORT`: `3000` (Hoặc để Railway tự cấp phát, nhưng NestJS đang listen port 3000 mặc định).
    *   `MONGODB_URI`: Connection string tới MongoDB (Bạn có thể tạo service MongoDB trên Railway và link vào).
    *   `JWT_ACCESS_SECRET`: (Tự đặt)
    *   `JWT_REFRESH_SECRET`: (Tự đặt)
    *   `CORS_ORIGIN`: `*` (Hoặc điền domain Frontend sau khi deploy xong).
5.  Railway sẽ build và deploy. Sau khi xong, vào tab **Settings** -> **Networking** -> **Generate Domain** để lấy URL (ví dụ: `https://backend-production.up.railway.app`).

## 3. Deploy Frontend React

1.  Trong cùng Project trên Railway, bấm **New Service** -> **GitHub Repo**.
2.  Chọn lại repository của dự án này.
3.  Vào **Settings** của Service Frontend mới:
    *   **Root Directory**: `/`
    *   **DockerfilePath**: `apps/frontend-react/Dockerfile`
    *   **Watch Paths** (Optional): `apps/frontend-react/**`
4.  Vào tab **Variables**, thêm biến môi trường quan trọng:
    *   `VITE_API_URL`: Điền URL của Backend đã deploy ở bước 2 (Ví dụ: `https://backend-production.up.railway.app`).
        *   *Lưu ý: Không có dấu `/` ở cuối. Ví dụ đúng: `https://backend.app`*
5.  Railway sẽ build và deploy. Vì Frontend là static site (Nginx), biến `VITE_API_URL` sẽ được bake vào code lúc build.
6.  Generate Domain cho Frontend để truy cập.

## 4. Cập nhật CORS (Quan trọng)

Sau khi có domain Frontend (ví dụ: `https://frontend-production.up.railway.app`), quay lại Service **Backend API** -> **Variables**:
*   Cập nhật `CORS_ORIGIN` thành `https://frontend-production.up.railway.app` (bỏ dấu `/` cuối).
*   Redeploy Backend để áp dụng.

## Lưu ý về Dockerfile

Dự án đã có sẵn `Dockerfile` chuẩn cho Nx Monorepo:
*   `apps/backend-api/Dockerfile`: Build NestJS app.
*   `apps/frontend-react/Dockerfile`: Build React app và serve bằng Nginx.

Nếu gặp lỗi build, hãy kiểm tra lại `Root Directory` trong Settings của Railway phải là `/` (gốc repo) để Docker có thể copy các file cấu hình chung (`nx.json`, `package.json`).
