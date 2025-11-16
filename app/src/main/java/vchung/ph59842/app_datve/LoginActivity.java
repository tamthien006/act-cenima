package vchung.ph59842.app_datve;

import android.content.Intent;
import android.os.Bundle;
import android.text.TextUtils;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import android.util.Log;
import com.google.gson.Gson;
import com.google.gson.JsonObject;

public class LoginActivity extends AppCompatActivity {

    private EditText etLoginEmail;
    private EditText etLoginPassword;
    private TextView tvLoginEmailError;
    private TextView tvLoginPasswordError;
    private Button btnSubmitLogin;
    private UserSession userSession;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_login);

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.loginRoot), (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
            return insets;
        });

        userSession = new UserSession(this);

        etLoginEmail = findViewById(R.id.etLoginEmail);
        etLoginPassword = findViewById(R.id.etLoginPassword);
        tvLoginEmailError = findViewById(R.id.tvLoginEmailError);
        tvLoginPasswordError = findViewById(R.id.tvLoginPasswordError);
        btnSubmitLogin = findViewById(R.id.btnSubmitLogin);

        View backButton = findViewById(R.id.btnBack);
        if (backButton != null) {
            backButton.setOnClickListener(view -> finish());
        }

        View registerLink = findViewById(R.id.tvRegisterNow);
        if (registerLink != null) {
            registerLink.setOnClickListener(view -> startActivity(RegisterActivity.createIntent(LoginActivity.this)));
        }

        if (btnSubmitLogin != null) {
            btnSubmitLogin.setOnClickListener(view -> handleLogin());
        }
    }

    private void handleLogin() {
        // Clear previous errors
        clearErrors();

        String email = etLoginEmail.getText().toString().trim();
        String password = etLoginPassword.getText().toString().trim();

        boolean isValid = true;

        // Validate email
        if (TextUtils.isEmpty(email)) {
            showError(tvLoginEmailError, "Vui lòng nhập email hoặc số điện thoại");
            isValid = false;
        }

        // Validate password
        if (TextUtils.isEmpty(password)) {
            showError(tvLoginPasswordError, "Vui lòng nhập mật khẩu");
            isValid = false;
        }

        if (!isValid) {
            return;
        }

        // Disable button during request
        btnSubmitLogin.setEnabled(false);
        btnSubmitLogin.setText("Đang xử lý...");

        // Call API
        vchung.ph59842.app_datve.api.ApiService apiService = vchung.ph59842.app_datve.api.ApiClient.getApiService(this);
        vchung.ph59842.app_datve.models.LoginRequest loginRequest = new vchung.ph59842.app_datve.models.LoginRequest(email, password);
        
        Log.d("LoginAPI", "Trying to login with email: " + email);
        try {
            Gson gson = new Gson();
            String requestJson = gson.toJson(loginRequest);
            Log.d("LoginAPI", "Login request body: " + requestJson);
            Log.d("LoginAPI", "API URL: " + vchung.ph59842.app_datve.api.ApiConfig.BASE_URL);
        } catch (Exception e) {
            Log.e("LoginAPI", "Error serializing login request", e);
        }
        

        apiService.login(loginRequest).enqueue(new retrofit2.Callback<vchung.ph59842.app_datve.models.AuthResponse>() {
            @Override
            public void onResponse(retrofit2.Call<vchung.ph59842.app_datve.models.AuthResponse> call, 
                                 retrofit2.Response<vchung.ph59842.app_datve.models.AuthResponse> response) {
                btnSubmitLogin.setEnabled(true);
                btnSubmitLogin.setText("Đăng nhập");

                Log.d("LoginResponse", "Response code: " + response.code());
                Log.d("LoginResponse", "Response isSuccessful: " + response.isSuccessful());
                Log.d("LoginResponse", "Response body is null: " + (response.body() == null));
                
                if (response.isSuccessful()) {
                    if (response.body() == null) {
                        Log.e("LoginResponse", "Response body is null despite successful status code!");
                        showRelevantFieldError("Lỗi: Không nhận được dữ liệu từ server");
                        return;
                    }
                    
                    vchung.ph59842.app_datve.models.AuthResponse authResponse = response.body();
                    
                    // Log response details để debug
                    Log.d("LoginResponse", "Response body - success: " + authResponse.isSuccess());
                    Log.d("LoginResponse", "Response body - token: " + (authResponse.getToken() != null ? "exists" : "null"));
                    Log.d("LoginResponse", "Response body - user: " + (authResponse.getUser() != null ? "exists" : "null"));
                    
                    // Log parsed response object
                    try {
                        Gson gson = new Gson();
                        String responseJson = gson.toJson(authResponse);
                        Log.d("LoginResponse", "Parsed response JSON: " + responseJson);
                    } catch (Exception e) {
                        Log.e("LoginResponse", "Error serializing response", e);
                    }
                    
                    if (authResponse.isSuccess() && authResponse.getToken() != null) {
                        String token = authResponse.getToken();
                        Log.d("LoginResponse", "Token received: " + (token != null ? token.substring(0, Math.min(30, token.length())) + "..." : "null"));
                        
                        // Lưu token và user (nếu có)
                        if (authResponse.getUser() != null) {
                            Log.d("LoginResponse", "User received: " + (authResponse.getUser().getName() != null ? authResponse.getUser().getName() : "no name"));
                            userSession.saveLoginSession(token, authResponse.getUser());
                        } else {
                            // Nếu user null, vẫn lưu token
                            Log.w("LoginResponse", "User is null in response, but token exists. Saving token only.");
                            userSession.saveLoginSession(token, null);
                        }
                        Toast.makeText(LoginActivity.this, "Đăng nhập thành công!", Toast.LENGTH_SHORT).show();
                        // Chuyển đến MainActivity, MainActivity sẽ tự động gọi API /me để lấy thông tin user
                        Intent intent = new Intent(LoginActivity.this, MainActivity.class);
                        intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(intent);
                        finish();
                    } else {
                        String errorMsg = extractAuthError(authResponse.getMessage(), authResponse.getError(), "Đăng nhập thất bại");
                        Log.e("LoginResponse", "Login failed - success: " + authResponse.isSuccess() + ", token: " + (authResponse.getToken() != null ? "exists" : "null"));
                        showRelevantFieldError(errorMsg);
                    }
                } else {
                    String errorMsg = "Đăng nhập thất bại";
                    Log.e("LoginError", "HTTP code: " + response.code());

                    if (response.errorBody() != null) {
                        try {
                            String errorBody = response.errorBody().string();
                            Log.e("LoginError", "Error body: " + errorBody);

                            errorMsg = parseErrorMessage(errorMsg, errorBody);
                        } catch (Exception e) {
                            Log.e("LoginError", "Error reading error body", e);
                        }
                    }

                    if (errorMsg.equals("Đăng nhập thất bại")) {
                    if (response.code() == 401) {
                            errorMsg = "Mật khẩu không chính xác";
                    } else if (response.code() == 404) {
                            errorMsg = "Email không tồn tại";
                        } else if (response.code() >= 500) {
                            errorMsg = "Lỗi server. Vui lòng thử lại sau!";
                        }
                    }

                    showRelevantFieldError(errorMsg);
                }
            }

            @Override
            public void onFailure(retrofit2.Call<vchung.ph59842.app_datve.models.AuthResponse> call, 
                               Throwable t) {
                btnSubmitLogin.setEnabled(true);
                btnSubmitLogin.setText("Đăng nhập");
                
                String errorMessage = "Lỗi kết nối. Vui lòng thử lại!";
                if (t != null) {
                    String error = t.getMessage();
                    if (error != null) {
                        if (error.contains("Unable to resolve host") || error.contains("Failed to connect")) {
                            errorMessage = "Không thể kết nối đến server. Vui lòng kiểm tra URL API!";
                        } else if (error.contains("timeout")) {
                            errorMessage = "Kết nối quá lâu. Vui lòng thử lại!";
                        }
                    }
                }
                showError(tvLoginEmailError, errorMessage);
                t.printStackTrace(); // Log để debug
            }
        });
    }

    private String extractAuthError(String message, String error, String defaultMsg) {
        if (message != null && !message.trim().isEmpty()) {
            return message;
        }
        if (error != null && !error.trim().isEmpty()) {
            return error;
        }
        return defaultMsg;
    }

    private String parseErrorMessage(String fallback, String errorBody) {
        String errorMsg = fallback;
        try {
            Gson gson = new Gson();
            JsonObject jsonObject = gson.fromJson(errorBody, JsonObject.class);
            if (jsonObject != null) {
                if (jsonObject.has("message") && !jsonObject.get("message").isJsonNull()) {
                    String msg = jsonObject.get("message").getAsString();
                    if (msg != null && !msg.trim().isEmpty()) {
                        errorMsg = msg;
                    }
                }
                if (errorMsg.equals(fallback) && jsonObject.has("error") && !jsonObject.get("error").isJsonNull()) {
                    String err = jsonObject.get("error").getAsString();
                    if (err != null && !err.trim().isEmpty()) {
                        errorMsg = err;
                    }
                }
                if (jsonObject.has("errors") && jsonObject.get("errors").isJsonObject()) {
                    JsonObject errors = jsonObject.getAsJsonObject("errors");
                    if (errors.has("email") && !errors.get("email").isJsonNull()) {
                        if (errors.get("email").isJsonArray()) {
                            errorMsg = errors.get("email").getAsJsonArray().get(0).getAsString();
                        } else {
                            errorMsg = errors.get("email").getAsString();
                        }
                    } else if (errors.has("password") && !errors.get("password").isJsonNull()) {
                        if (errors.get("password").isJsonArray()) {
                            errorMsg = errors.get("password").getAsJsonArray().get(0).getAsString();
                        } else {
                            errorMsg = errors.get("password").getAsString();
                        }
                    }
                }
            }
        } catch (Exception parseEx) {
            Log.d("LoginError", "Cannot parse error JSON: " + parseEx.getMessage());
        }
        return errorMsg;
    }

    private void showRelevantFieldError(String errorMsg) {
        String lowerError = errorMsg.toLowerCase();
        if (lowerError.contains("password") || lowerError.contains("mật khẩu")) {
            showError(tvLoginPasswordError, errorMsg);
        } else if (lowerError.contains("email") || lowerError.contains("mail")) {
            showError(tvLoginEmailError, errorMsg);
        } else {
            showError(tvLoginEmailError, errorMsg);
        }
    }

    private void clearErrors() {
        hideError(tvLoginEmailError);
        hideError(tvLoginPasswordError);
    }

    private void showError(TextView errorView, String message) {
        if (errorView != null) {
            errorView.setText(message);
            errorView.setVisibility(View.VISIBLE);
        }
    }

    private void hideError(TextView errorView) {
        if (errorView != null) {
            errorView.setVisibility(View.GONE);
        }
    }
}

