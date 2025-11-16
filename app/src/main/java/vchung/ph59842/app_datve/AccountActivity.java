package vchung.ph59842.app_datve;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;

import java.util.List;

import vchung.ph59842.app_datve.api.ApiService;
import vchung.ph59842.app_datve.models.ApiResponse;
import vchung.ph59842.app_datve.models.Promotion;
import vchung.ph59842.app_datve.models.User;

public class AccountActivity extends AppCompatActivity {
    
    private UserSession userSession;
    private TextView tvUserName;
    private TextView tvUserEmail;
    private TextView tvMemberLevel;
    private TextView tvPoints;
    private TextView tvTicketsViewed;
    private TextView tvProgressText;
    private ProgressBar progressBar;
    
    private LinearLayout tabVouchers;
    private LinearLayout tabHistory;
    private TextView tvTabVouchers;
    private TextView tvTabHistory;
    private ImageView iconTabVouchers;
    private ImageView iconTabHistory;
    
    private LinearLayout vouchersContainer;
    private LinearLayout historyContainer;
    
    private Button btnLogout;
    
    private boolean isVouchersTabActive = true;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_account);
        
        userSession = new UserSession(this);
        
        // Check if user is logged in
        if (!userSession.isLoggedIn()) {
            Intent intent = new Intent(this, LoginActivity.class);
            startActivity(intent);
            finish();
            return;
        }
        
        initViews();
        setupTabs();
        loadUserInfo();
        loadVouchers();
        loadBookingHistory();
        
        btnLogout.setOnClickListener(v -> logout());
    }
    
    private void initViews() {
        tvUserName = findViewById(R.id.tvAccountUserName);
        tvUserEmail = findViewById(R.id.tvAccountUserEmail);
        tvMemberLevel = findViewById(R.id.tvMemberLevel);
        tvPoints = findViewById(R.id.tvPoints);
        tvTicketsViewed = findViewById(R.id.tvTicketsViewed);
        tvProgressText = findViewById(R.id.tvProgressText);
        progressBar = findViewById(R.id.progressBar);
        
        tabVouchers = findViewById(R.id.tabVouchers);
        tabHistory = findViewById(R.id.tabHistory);
        tvTabVouchers = findViewById(R.id.tvTabVouchers);
        tvTabHistory = findViewById(R.id.tvTabHistory);
        iconTabVouchers = findViewById(R.id.iconTabVouchers);
        iconTabHistory = findViewById(R.id.iconTabHistory);
        
        vouchersContainer = findViewById(R.id.vouchersContainer);
        historyContainer = findViewById(R.id.historyContainer);
        
        btnLogout = findViewById(R.id.btnLogout);
    }
    
    private void setupTabs() {
        tabVouchers.setOnClickListener(v -> switchTab(true));
        tabHistory.setOnClickListener(v -> switchTab(false));
    }
    
    private void switchTab(boolean showVouchers) {
        isVouchersTabActive = showVouchers;
        
        if (showVouchers) {
            vouchersContainer.setVisibility(View.VISIBLE);
            historyContainer.setVisibility(View.GONE);
            
            // Update tab styles
            tabVouchers.setBackgroundResource(R.drawable.bg_tab_selected);
            tabHistory.setBackgroundResource(R.drawable.bg_tab_unselected);
            tvTabVouchers.setTextColor(ContextCompat.getColor(this, R.color.tab_active));
            tvTabHistory.setTextColor(ContextCompat.getColor(this, R.color.neutral_subtext));
            iconTabVouchers.setColorFilter(ContextCompat.getColor(this, R.color.tab_active));
            iconTabHistory.setColorFilter(ContextCompat.getColor(this, R.color.neutral_subtext));
        } else {
            vouchersContainer.setVisibility(View.GONE);
            historyContainer.setVisibility(View.VISIBLE);
            
            // Update tab styles
            tabVouchers.setBackgroundResource(R.drawable.bg_tab_unselected);
            tabHistory.setBackgroundResource(R.drawable.bg_tab_selected);
            tvTabVouchers.setTextColor(ContextCompat.getColor(this, R.color.neutral_subtext));
            tvTabHistory.setTextColor(ContextCompat.getColor(this, R.color.tab_active));
            iconTabVouchers.setColorFilter(ContextCompat.getColor(this, R.color.neutral_subtext));
            iconTabHistory.setColorFilter(ContextCompat.getColor(this, R.color.tab_active));
        }
    }
    
    private void loadUserInfo() {
        User user = userSession.getUser();
        if (user != null) {
            if (tvUserName != null) {
                tvUserName.setText("Xin chào, " + (user.getName() != null ? user.getName() : "Thành viên"));
            }
            if (tvUserEmail != null) {
                tvUserEmail.setText(user.getEmail() != null ? user.getEmail() : "");
            }
            
            // Set member level
            String level = user.getMemberLevel() != null ? user.getMemberLevel() : "Đồng";
            if (tvMemberLevel != null) {
                tvMemberLevel.setText(level);
            }
            
            // Set points
            int points = user.getPoints();
            if (tvPoints != null) {
                tvPoints.setText(formatPointsSimple(points) + " điểm");
            }
            
            // Set tickets viewed (placeholder - need to get from API)
            if (tvTicketsViewed != null) {
                tvTicketsViewed.setText("12 vé"); // TODO: Get from API
            }
            
            // Set progress (placeholder)
            int currentPoints = points;
            int nextLevelPoints = getNextLevelPoints(level);
            int progress = nextLevelPoints > 0 ? (int) ((currentPoints / (float) nextLevelPoints) * 100) : 0;
            if (progressBar != null) {
                progressBar.setProgress(Math.min(progress, 100));
            }
            if (tvProgressText != null) {
                tvProgressText.setText(formatPointsSimple(currentPoints) + " / " + formatPointsSimple(nextLevelPoints));
            }
        } else {
            // Load from API
            ApiService apiService = vchung.ph59842.app_datve.api.ApiClient.getApiService(this);
            apiService.getMe().enqueue(new retrofit2.Callback<ApiResponse<User>>() {
                @Override
                public void onResponse(retrofit2.Call<ApiResponse<User>> call, 
                                     retrofit2.Response<ApiResponse<User>> response) {
                    if (response.isSuccessful() && response.body() != null) {
                        ApiResponse<User> apiResponse = response.body();
                        if (apiResponse.isSuccess() && apiResponse.getData() != null) {
                            User user = apiResponse.getData();
                            userSession.updateUser(user);
                            loadUserInfo(); // Reload
                        }
                    }
                }

                @Override
                public void onFailure(retrofit2.Call<ApiResponse<User>> call, Throwable t) {
                    android.util.Log.e("AccountActivity", "Error loading user info", t);
                }
            });
        }
    }
    
    private String formatPoints(int points) {
        return String.format("%,d", points).replace(",", ".") + " điểm";
    }
    
    private String formatPointsSimple(int points) {
        return String.format("%,d", points).replace(",", ".");
    }
    
    private int getNextLevelPoints(String currentLevel) {
        switch (currentLevel) {
            case "Đồng": return 1000;
            case "Bạc": return 5000;
            case "Vàng": return 10000;
            case "Bạch Kim": return 20000;
            default: return 5000;
        }
    }
    
    private void loadVouchers() {
        ApiService apiService = vchung.ph59842.app_datve.api.ApiClient.getApiService(this);
        apiService.getPromotions().enqueue(new retrofit2.Callback<ApiResponse<List<Promotion>>>() {
            @Override
            public void onResponse(retrofit2.Call<ApiResponse<List<Promotion>>> call, 
                                 retrofit2.Response<ApiResponse<List<Promotion>>> response) {
                if (response.isSuccessful() && response.body() != null) {
                    ApiResponse<List<Promotion>> apiResponse = response.body();
                    if (apiResponse.isSuccess() && apiResponse.getData() != null) {
                        List<Promotion> promotions = apiResponse.getData();
                        displayVouchers(promotions);
                    } else {
                        showNoVouchers();
                    }
                } else {
                    showNoVouchers();
                }
            }

            @Override
            public void onFailure(retrofit2.Call<ApiResponse<List<Promotion>>> call, Throwable t) {
                android.util.Log.e("AccountActivity", "Error loading vouchers", t);
                showNoVouchers();
            }
        });
    }
    
    private void displayVouchers(List<Promotion> promotions) {
        vouchersContainer.removeAllViews();
        
        if (promotions == null || promotions.isEmpty()) {
            showNoVouchers();
            return;
        }
        
        // Filter active promotions
        for (Promotion promo : promotions) {
            if (promo.isAvailable()) {
                View voucherView = createVoucherView(promo);
                vouchersContainer.addView(voucherView);
            }
        }
        
        if (vouchersContainer.getChildCount() == 0) {
            showNoVouchers();
        }
    }
    
    private View createVoucherView(Promotion promo) {
        // Use the same layout as VoucherActivity
        View view = getLayoutInflater().inflate(R.layout.item_voucher, vouchersContainer, false);
        
        TextView tvDiscountValue = view.findViewById(R.id.tvDiscountValue);
        TextView tvVoucherName = view.findViewById(R.id.tvVoucherName);
        TextView tvVoucherDescription = view.findViewById(R.id.tvVoucherDescription);
        TextView tvExpiryDate = view.findViewById(R.id.tvExpiryDate);
        TextView tvVoucherCode = view.findViewById(R.id.tvVoucherCode);
        Button btnUseVoucher = view.findViewById(R.id.btnUseVoucher);
        
        // Set discount value using the same method as VoucherActivity
        String discountText = promo.getFormattedDiscount();
        if (tvDiscountValue != null) {
            tvDiscountValue.setText(discountText);
        }
        
        // Set name
        if (tvVoucherName != null && promo.getName() != null) {
            tvVoucherName.setText(promo.getName());
        }
        
        // Set description
        if (tvVoucherDescription != null && promo.getDescription() != null) {
            tvVoucherDescription.setText(promo.getDescription());
        }
        
        // Set expiry date (same format as VoucherActivity)
        if (tvExpiryDate != null && promo.getEndDate() != null) {
            try {
                java.text.SimpleDateFormat inputFormat = new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US);
                inputFormat.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));
                java.util.Date endDate = inputFormat.parse(promo.getEndDate());
                if (endDate != null) {
                    java.text.SimpleDateFormat outputFormat = new java.text.SimpleDateFormat("dd/MM/yyyy", java.util.Locale.getDefault());
                    tvExpiryDate.setText("HSD: " + outputFormat.format(endDate));
                }
            } catch (Exception e) {
                android.util.Log.e("AccountActivity", "Error parsing date", e);
                // Fallback to simple date parsing
                String date = promo.getEndDate();
                if (date.contains("T")) {
                    date = date.substring(0, date.indexOf("T"));
                }
                String[] parts = date.split("-");
                if (parts.length == 3) {
                    tvExpiryDate.setText("HSD: " + parts[2] + "/" + parts[1] + "/" + parts[0]);
                } else {
                    tvExpiryDate.setText("HSD: N/A");
                }
            }
        }
        
        // Set voucher code
        if (tvVoucherCode != null && promo.getCode() != null) {
            tvVoucherCode.setText("Mã: " + promo.getCode());
        }
        
        // Set button text and click listener (same as VoucherActivity)
        if (btnUseVoucher != null) {
            btnUseVoucher.setText("Sử dụng");
            btnUseVoucher.setOnClickListener(v -> {
                android.widget.Toast.makeText(AccountActivity.this, 
                    "Sử dụng voucher: " + promo.getCode(), 
                    android.widget.Toast.LENGTH_SHORT).show();
                // TODO: Implement voucher usage logic
            });
            btnUseVoucher.setEnabled(true);
            btnUseVoucher.setAlpha(1.0f);
        }
        
        return view;
    }
    
    private void showNoVouchers() {
        vouchersContainer.removeAllViews();
        TextView textView = new TextView(this);
        textView.setText("Chưa có voucher nào");
        textView.setTextColor(ContextCompat.getColor(this, R.color.neutral_subtext));
        textView.setTextSize(14);
        textView.setPadding(0, 32, 0, 32);
        textView.setGravity(android.view.Gravity.CENTER);
        vouchersContainer.addView(textView);
    }
    
    private void loadBookingHistory() {
        // TODO: Implement API call to get booking history
        // For now, show placeholder
        historyContainer.removeAllViews();
        TextView textView = new TextView(this);
        textView.setText("Chưa có lịch sử đặt vé");
        textView.setTextColor(ContextCompat.getColor(this, R.color.neutral_subtext));
        textView.setTextSize(14);
        textView.setPadding(0, 32, 0, 32);
        textView.setGravity(android.view.Gravity.CENTER);
        historyContainer.addView(textView);
    }
    
    private void logout() {
        userSession.logout();
        Intent intent = new Intent(this, LoginActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
        finish();
    }
    
    public static Intent createIntent(android.content.Context context) {
        return new Intent(context, AccountActivity.class);
    }
}

