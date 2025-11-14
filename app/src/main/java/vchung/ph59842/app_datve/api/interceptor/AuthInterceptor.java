package vchung.ph59842.app_datve.api.interceptor;

import android.content.Context;

import java.io.IOException;

import okhttp3.Interceptor;
import okhttp3.Request;
import okhttp3.Response;
import vchung.ph59842.app_datve.UserSession;

public class AuthInterceptor implements Interceptor {
    private Context context;

    public AuthInterceptor(Context context) {
        this.context = context;
    }

    @Override
    public Response intercept(Chain chain) throws IOException {
        Request originalRequest = chain.request();
        UserSession userSession = new UserSession(context);
        String token = userSession.getToken();

        Request.Builder requestBuilder = originalRequest.newBuilder()
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .header("ngrok-skip-browser-warning", "true"); // Bỏ qua warning page của ngrok

        if (token != null && !token.isEmpty()) {
            // Đảm bảo token không có khoảng trắng thừa
            String cleanToken = token.trim();
            String authHeader = "Bearer " + cleanToken;
            requestBuilder.header("Authorization", authHeader);
            android.util.Log.d("AuthInterceptor", "Adding Authorization header for: " + originalRequest.url());
            android.util.Log.d("AuthInterceptor", "Token preview: " + cleanToken.substring(0, Math.min(30, cleanToken.length())) + "...");
        } else {
            android.util.Log.w("AuthInterceptor", "No token available for: " + originalRequest.url());
        }

        Request newRequest = requestBuilder.build();
        Response response = chain.proceed(newRequest);
        
        // Nếu nhận được 401 hoặc 500 từ /auth/me, có thể token không hợp lệ
        if (response.code() == 401 || (response.code() == 500 && originalRequest.url().toString().contains("/auth/me"))) {
            android.util.Log.w("AuthInterceptor", "Received " + response.code() + " for " + originalRequest.url() + ", token may be invalid");
        }
        
        return response;
    }
}

