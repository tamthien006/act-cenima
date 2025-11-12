package vchung.ph59842.app_datve;

import android.content.Context;
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

import com.google.gson.Gson;
import com.google.gson.JsonObject;

public class RegisterActivity extends AppCompatActivity {

    private EditText etRegisterName;
    private EditText etRegisterEmail;
    private EditText etRegisterPassword;
    private EditText etRegisterConfirmPassword;
    private EditText etRegisterPhone;
    private TextView tvRegisterNameError;
    private TextView tvRegisterEmailError;
    private TextView tvRegisterPasswordError;
    private TextView tvRegisterConfirmPasswordError;
    private TextView tvRegisterPhoneError;
    private Button btnSubmitRegister;
    private UserSession userSession;

    public static Intent createIntent(Context context) {
        return new Intent(context, RegisterActivity.class);
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_register);

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.registerRoot), (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
            return insets;
        });

        userSession = new UserSession(this);

        etRegisterName = findViewById(R.id.etRegisterName);
        etRegisterEmail = findViewById(R.id.etRegisterEmail);
        etRegisterPassword = findViewById(R.id.etRegisterPassword);
        etRegisterConfirmPassword = findViewById(R.id.etRegisterConfirmPassword);
        etRegisterPhone = findViewById(R.id.etRegisterPhone);
        tvRegisterNameError = findViewById(R.id.tvRegisterNameError);
        tvRegisterEmailError = findViewById(R.id.tvRegisterEmailError);
        tvRegisterPasswordError = findViewById(R.id.tvRegisterPasswordError);
        tvRegisterConfirmPasswordError = findViewById(R.id.tvRegisterConfirmPasswordError);
        tvRegisterPhoneError = findViewById(R.id.tvRegisterPhoneError);
        btnSubmitRegister = findViewById(R.id.btnSubmitRegister);

        View backButton = findViewById(R.id.btnBack);
        if (backButton != null) {
            backButton.setOnClickListener(view -> finish());
        }

        if (btnSubmitRegister != null) {
            btnSubmitRegister.setOnClickListener(view -> handleRegister());
        }
    }

    private void handleRegister() {
        // Clear previous errors
        clearErrors();

        String name = etRegisterName.getText().toString().trim();
        String email = etRegisterEmail.getText().toString().trim();
        String password = etRegisterPassword.getText().toString().trim();
        String confirmPassword = etRegisterConfirmPassword.getText().toString().trim();
        String phone = etRegisterPhone.getText().toString().trim();

        boolean isValid = true;

        // Validate name
        if (TextUtils.isEmpty(name)) {
            showError(tvRegisterNameError, "Vui lòng nhập họ và tên");
            isValid = false;
        } else if (name.length() < 2) {
            showError(tvRegisterNameError, "Họ và tên phải có ít nhất 2 ký tự");
            isValid = false;
        }

        // Validate email
        if (TextUtils.isEmpty(email)) {
            showError(tvRegisterEmailError, "Vui lòng nhập email");
            isValid = false;
        } else {
            // Kiểm tra format email (match với regex của server: /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/)
            String emailPattern = "^[\\w]+([\\.-]?[\\w]+)*@[\\w]+([\\.-]?[\\w]+)*(\\.[\\w]{2,3})+$";
            if (!email.matches(emailPattern)) {
                showError(tvRegisterEmailError, "Email không hợp lệ. Ví dụ: user@example.com");
                isValid = false;
            }
        }

        // Validate phone
        String finalPhone = null;
        if (TextUtils.isEmpty(phone)) {
            showError(tvRegisterPhoneError, "Vui lòng nhập số điện thoại");
            isValid = false;
        } else {
            String cleanPhone = phone.replaceAll("[^0-9]", "");
            if (cleanPhone.length() < 10 || cleanPhone.length() > 15) {
                showError(tvRegisterPhoneError, "Số điện thoại phải có 10-15 chữ số");
                isValid = false;
            } else {
                finalPhone = cleanPhone;
            }
        }

        // Validate password
        if (TextUtils.isEmpty(password)) {
            showError(tvRegisterPasswordError, "Vui lòng nhập mật khẩu");
            isValid = false;
        } else if (password.length() < 6) {
            showError(tvRegisterPasswordError, "Mật khẩu phải có ít nhất 6 ký tự");
            isValid = false;
        }

        // Validate confirm password
        if (TextUtils.isEmpty(confirmPassword)) {
            showError(tvRegisterConfirmPasswordError, "Vui lòng xác nhận mật khẩu");
            isValid = false;
        } else if (!password.equals(confirmPassword)) {
            showError(tvRegisterConfirmPasswordError, "Mật khẩu xác nhận không khớp");
            isValid = false;
        }

        if (!isValid) {
            return;
        }

        // Disable button during request
        btnSubmitRegister.setEnabled(false);
        btnSubmitRegister.setText("Đang xử lý...");

        // Call API
        vchung.ph59842.app_datve.api.ApiService apiService = vchung.ph59842.app_datve.api.ApiClient.getApiService(this);
        
        String finalEmail = null;
        
        // Kiểm tra xem email đã hợp lệ hay chưa (đã validate phía trên)
        String emailPattern = "^[\\w]+([\\.-]?[\\w]+)*@[\\w]+([\\.-]?[\\w]+)*(\\.[\\w]{2,3})+$";
        if (email.matches(emailPattern)) {
            finalEmail = email.trim();
        } else {
            showError(tvRegisterEmailError, "Email không hợp lệ. Ví dụ: user@example.com");
            btnSubmitRegister.setEnabled(true);
            btnSubmitRegister.setText("Đăng ký");
            return;
        }
        
        // Email là required trong schema
        if (finalEmail == null || finalEmail.isEmpty()) {
            showError(tvRegisterEmailError, "Email là bắt buộc để đăng ký");
            btnSubmitRegister.setEnabled(true);
            btnSubmitRegister.setText("Đăng ký");
            return;
        }
        
        vchung.ph59842.app_datve.models.RegisterRequest registerRequest = 
            new vchung.ph59842.app_datve.models.RegisterRequest(name, finalEmail, password, finalPhone);
        
        android.util.Log.d("RegisterAPI", "Calling register API with: name=" + name + ", email=" + finalEmail + ", phone=" + finalPhone);
        android.util.Log.d("RegisterAPI", "API URL: " + vchung.ph59842.app_datve.api.ApiConfig.BASE_URL);
        
        // Log request body để debug
        try {
            Gson gson = new Gson();
            String requestJson = gson.toJson(registerRequest);
            android.util.Log.d("RegisterAPI", "Request body: " + requestJson);
        } catch (Exception e) {
            android.util.Log.e("RegisterAPI", "Error serializing request", e);
        }
        
        apiService.register(registerRequest).enqueue(new retrofit2.Callback<vchung.ph59842.app_datve.models.AuthResponse>() {
            @Override
            public void onResponse(retrofit2.Call<vchung.ph59842.app_datve.models.AuthResponse> call, 
                                 retrofit2.Response<vchung.ph59842.app_datve.models.AuthResponse> response) {
                btnSubmitRegister.setEnabled(true);
                btnSubmitRegister.setText("Đăng ký");

                android.util.Log.d("RegisterResponse", "Response code: " + response.code());
                android.util.Log.d("RegisterResponse", "Response isSuccessful: " + response.isSuccessful());
                android.util.Log.d("RegisterResponse", "Response body is null: " + (response.body() == null));
                
                if (response.isSuccessful()) {
                    if (response.body() == null) {
                        android.util.Log.e("RegisterResponse", "Response body is null despite successful status code!");
                        showFieldError("Lỗi: Không nhận được dữ liệu từ server");
                        return;
                    }
                    vchung.ph59842.app_datve.models.AuthResponse authResponse = response.body();
                    
                    // Log response details để debug
                    android.util.Log.d("RegisterResponse", "Response body - success: " + authResponse.isSuccess());
                    android.util.Log.d("RegisterResponse", "Response body - token: " + (authResponse.getToken() != null ? "exists" : "null"));
                    android.util.Log.d("RegisterResponse", "Response body - user: " + (authResponse.getUser() != null ? "exists" : "null"));
                    
                    // Log parsed response object
                    try {
                        Gson gson = new Gson();
                        String responseJson = gson.toJson(authResponse);
                        android.util.Log.d("RegisterResponse", "Parsed response JSON: " + responseJson);
                    } catch (Exception e) {
                        android.util.Log.e("RegisterResponse", "Error serializing response", e);
                    }
                    
                    if (authResponse.isSuccess() && authResponse.getToken() != null) {
                        // Lưu token và user (nếu có)
                        if (authResponse.getUser() != null) {
                            userSession.saveLoginSession(authResponse.getToken(), authResponse.getUser());
                        } else {
                            // Nếu user null, vẫn lưu token
                            android.util.Log.w("RegisterResponse", "User is null in response, but token exists. Saving token only.");
                            userSession.saveLoginSession(authResponse.getToken(), null);
                        }
                        Toast.makeText(RegisterActivity.this, "Đăng ký thành công!", Toast.LENGTH_SHORT).show();
                        // Chuyển đến MainActivity, MainActivity sẽ tự động gọi API /me để lấy thông tin user
                        Intent intent = new Intent(RegisterActivity.this, MainActivity.class);
                        intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(intent);
                        finish();
                    } else {
                        String errorMsg = extractAuthError(authResponse.getMessage(), authResponse.getError(), "Đăng ký thất bại");
                        android.util.Log.e("RegisterResponse", "Registration failed - success: " + authResponse.isSuccess() + ", token: " + (authResponse.getToken() != null ? "exists" : "null"));
                        showFieldError(errorMsg);
                    }
                } else {
                    // Response không thành công (status code != 2xx)
                    String errorMsg = "Đăng ký thất bại";
                    
                    // Thử parse error body
                    android.util.Log.e("RegisterError", "Response code: " + response.code());
                    if (response.errorBody() != null) {
                        try {
                            String errorBody = response.errorBody().string();
                            android.util.Log.e("RegisterError", "Error body: " + errorBody);
                            
                            // Thử parse JSON error - đơn giản hóa để tránh crash
                            errorMsg = parseErrorMessage(errorMsg, errorBody);
                        } catch (Exception e) {
                            android.util.Log.e("RegisterError", "Error reading error body", e);
                        }
                    }
                    
                    // Xử lý theo status code (chỉ thêm prefix nếu errorMsg vẫn là mặc định)
                    if (errorMsg.equals("Đăng ký thất bại")) {
                        if (response.code() == 400) {
                            errorMsg = "Dữ liệu không hợp lệ";
                        } else if (response.code() == 409) {
                            errorMsg = "Email hoặc số điện thoại đã được sử dụng";
                        } else if (response.code() == 500) {
                            errorMsg = "Lỗi server. Vui lòng thử lại sau!";
                        } else if (response.code() == 422) {
                            errorMsg = "Dữ liệu không hợp lệ";
                        }
                    }
                    
                    showFieldError(errorMsg);
                    android.util.Log.e("RegisterError", "Response code: " + response.code() + ", Message: " + errorMsg);
                }
            }

            @Override
            public void onFailure(retrofit2.Call<vchung.ph59842.app_datve.models.AuthResponse> call, 
                               Throwable t) {
                btnSubmitRegister.setEnabled(true);
                btnSubmitRegister.setText("Đăng ký");
                
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
                showError(tvRegisterEmailError, errorMessage);
                android.util.Log.e("RegisterError", "Network error: " + (t != null ? t.getMessage() : "Unknown"), t);
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

    private String parseErrorMessage(String defaultMsg, String errorBody) {
        String errorMsg = defaultMsg;
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
                if (errorMsg.equals(defaultMsg) && jsonObject.has("error") && !jsonObject.get("error").isJsonNull()) {
                    String err = jsonObject.get("error").getAsString();
                    if (err != null && !err.trim().isEmpty()) {
                        errorMsg = err;
                    }
                }
                if (jsonObject.has("errors")) {
                    if (jsonObject.get("errors").isJsonObject()) {
                        JsonObject errors = jsonObject.getAsJsonObject("errors");
                        if (errors.has("email") && !errors.get("email").isJsonNull()) {
                            errorMsg = extractFirstError(errors.get("email"));
                        } else if (errors.has("phone") && !errors.get("phone").isJsonNull()) {
                            errorMsg = extractFirstError(errors.get("phone"));
                        } else if (errors.has("password") && !errors.get("password").isJsonNull()) {
                            errorMsg = extractFirstError(errors.get("password"));
                        } else if (errors.has("name") && !errors.get("name").isJsonNull()) {
                            errorMsg = extractFirstError(errors.get("name"));
                        }
                    } else if (jsonObject.get("errors").isJsonArray() && jsonObject.get("errors").getAsJsonArray().size() > 0) {
                        // errors có thể là mảng các object { msg, path }
                        JsonObject firstError = jsonObject.get("errors").getAsJsonArray().get(0).getAsJsonObject();
                        if (firstError.has("msg") && !firstError.get("msg").isJsonNull()) {
                            errorMsg = firstError.get("msg").getAsString();
                        }
                    }
                }
            }
        } catch (Exception e) {
            android.util.Log.d("RegisterError", "Cannot parse error JSON: " + e.getMessage());
        }
        return errorMsg;
    }

    private String extractFirstError(com.google.gson.JsonElement element) {
        if (element.isJsonArray() && element.getAsJsonArray().size() > 0) {
            return element.getAsJsonArray().get(0).getAsString();
        }
        if (element.isJsonPrimitive()) {
            return element.getAsString();
        }
        return "Dữ liệu không hợp lệ";
    }

    private void showFieldError(String errorMsg) {
        String lowerError = errorMsg.toLowerCase();
        if (lowerError.contains("phone") || lowerError.contains("số điện thoại") || lowerError.contains("điện thoại")) {
            showError(tvRegisterPhoneError, errorMsg);
        } else if (lowerError.contains("email") || lowerError.contains("mail")) {
            showError(tvRegisterEmailError, errorMsg);
        } else if (lowerError.contains("password") || lowerError.contains("mật khẩu")) {
            showError(tvRegisterPasswordError, errorMsg);
        } else if (lowerError.contains("name") || lowerError.contains("tên")) {
            showError(tvRegisterNameError, errorMsg);
        } else {
            showError(tvRegisterEmailError, errorMsg);
        }
    }

    private void clearErrors() {
        hideError(tvRegisterNameError);
        hideError(tvRegisterEmailError);
        hideError(tvRegisterPasswordError);
        hideError(tvRegisterConfirmPasswordError);
        hideError(tvRegisterPhoneError);
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
