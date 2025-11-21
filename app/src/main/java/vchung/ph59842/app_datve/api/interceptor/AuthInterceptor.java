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
        String url = originalRequest.url().toString();
        
        // List of public endpoints that don't require authentication
        boolean isPublicEndpoint = url.contains("/auth/register") ||
                                  url.contains("/auth/login") ||
                                  url.contains("/promotions") && !url.contains("/promotions/me");
        
        Request.Builder requestBuilder = originalRequest.newBuilder()
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .header("ngrok-skip-browser-warning", "true"); // Bỏ qua warning page của ngrok

        // Only add token for protected endpoints
        if (!isPublicEndpoint) {
            UserSession userSession = new UserSession(context);
            String token = userSession.getToken();

            if (token != null && !token.isEmpty()) {
                // Đảm bảo token không có khoảng trắng thừa
                String cleanToken = token.trim();
                String authHeader = "Bearer " + cleanToken;
                requestBuilder.header("Authorization", authHeader);
                android.util.Log.d("AuthInterceptor", "Adding Authorization header for: " + url);
                android.util.Log.d("AuthInterceptor", "Token preview: " + cleanToken.substring(0, Math.min(30, cleanToken.length())) + "...");
            } else {
                android.util.Log.w("AuthInterceptor", "No token available for: " + url);
            }
        } else {
            android.util.Log.d("AuthInterceptor", "Skipping auth for public endpoint: " + url);
        }

        Request newRequest = requestBuilder.build();
        Response response = chain.proceed(newRequest);
        
        // Nếu nhận được 401, token không hợp lệ - clear session
        if (response.code() == 401 && !isPublicEndpoint) {
            android.util.Log.w("AuthInterceptor", "Received 401 for " + url + ", token may be invalid");
            // Optionally clear invalid token
            UserSession userSession = new UserSession(context);
            if (userSession.isLoggedIn()) {
                android.util.Log.w("AuthInterceptor", "Token invalid, but keeping session for now");
            }
        }
        
        return response;
    }
}

