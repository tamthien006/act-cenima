package vchung.ph59842.app_datve;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Button;
import java.util.List;
import java.text.SimpleDateFormat;
import java.util.Locale;
import java.util.Date;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import vchung.ph59842.app_datve.api.ApiService;
import vchung.ph59842.app_datve.api.ApiClient;
import vchung.ph59842.app_datve.models.ApiResponse;
import vchung.ph59842.app_datve.models.Promotion;

public class VoucherActivity extends AppCompatActivity {

    private LinearLayout vouchersContainer;
    private LinearLayout redeemVouchersContainer;
    private TextView tvNoVouchers;
    private TextView tvNoRedeemVouchers;
    private View groupMy;
    private View groupRedeem;

    public static Intent createIntent(Context context) {
        return new Intent(context, VoucherActivity.class);
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_voucher);

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.voucherRoot), (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
            return insets;
        });

        View backButton = findViewById(R.id.btnBack);
        if (backButton != null) {
            backButton.setOnClickListener(view -> finish());
        }

        vouchersContainer = findViewById(R.id.vouchersContainer);
        redeemVouchersContainer = findViewById(R.id.redeemVouchersContainer);
        tvNoVouchers = findViewById(R.id.tvNoVouchers);
        tvNoRedeemVouchers = findViewById(R.id.tvNoRedeemVouchers);

        View tabMy = findViewById(R.id.tabMyVoucher);
        View tabRedeem = findViewById(R.id.tabRedeemVoucher);
        groupMy = findViewById(R.id.groupMyVoucher);
        groupRedeem = findViewById(R.id.groupRedeemVoucher);

        View.OnClickListener selectMy = view -> {
            updateTabState(true, tabMy, tabRedeem, groupMy, groupRedeem);
            loadMyVouchers();
        };
        View.OnClickListener selectRedeem = view -> {
            updateTabState(false, tabMy, tabRedeem, groupMy, groupRedeem);
            loadRedeemVouchers();
        };

        if (tabMy != null) {
            tabMy.setOnClickListener(selectMy);
        }
        if (tabRedeem != null) {
            tabRedeem.setOnClickListener(selectRedeem);
        }

        updateTabState(true, tabMy, tabRedeem, groupMy, groupRedeem);
        loadMyVouchers();
    }

    private void loadMyVouchers() {
        android.util.Log.d("VoucherActivity", "=== Loading my vouchers ===");
        ApiService apiService = ApiClient.getApiService(this);
        android.util.Log.d("VoucherActivity", "API service created, making request to /promotions");
        apiService.getPromotions().enqueue(new retrofit2.Callback<ApiResponse<List<Promotion>>>() {
            @Override
            public void onResponse(retrofit2.Call<ApiResponse<List<Promotion>>> call, 
                                 retrofit2.Response<ApiResponse<List<Promotion>>> response) {
                android.util.Log.d("VoucherActivity", "=== Response received ===");
                android.util.Log.d("VoucherActivity", "Response code: " + response.code());
                android.util.Log.d("VoucherActivity", "Response isSuccessful: " + response.isSuccessful());
                android.util.Log.d("VoucherActivity", "Response body is null: " + (response.body() == null));
                
                // Note: Raw response body is already logged by HttpLoggingInterceptor
                // Check logcat for "OkHttp" logs to see the actual JSON response
                
                if (response.isSuccessful() && response.body() != null) {
                    ApiResponse<List<Promotion>> apiResponse = response.body();
                    android.util.Log.d("VoucherActivity", "API success: " + apiResponse.isSuccess());
                    android.util.Log.d("VoucherActivity", "API data is null: " + (apiResponse.getData() == null));
                    
                    if (apiResponse.isSuccess()) {
                        List<Promotion> allPromotions = apiResponse.getData();
                        if (allPromotions == null) {
                            android.util.Log.w("VoucherActivity", "API returned success but data is null");
                            showNoVouchers(true);
                            return;
                        }
                        android.util.Log.d("VoucherActivity", "Loaded " + allPromotions.size() + " promotions from API");
                        
                        // Log all promotions details for debugging
                        for (int i = 0; i < allPromotions.size(); i++) {
                            Promotion promo = allPromotions.get(i);
                            android.util.Log.d("VoucherActivity", "Promotion " + (i + 1) + ":");
                            android.util.Log.d("VoucherActivity", "  - Code: " + promo.getCode());
                            android.util.Log.d("VoucherActivity", "  - Name: " + promo.getName());
                            android.util.Log.d("VoucherActivity", "  - Type: " + promo.getType() + ", DiscountType: " + promo.getDiscountType());
                            android.util.Log.d("VoucherActivity", "  - Value: " + promo.getValue() + ", DiscountValue: " + promo.getDiscountValue());
                            android.util.Log.d("VoucherActivity", "  - isActive: " + promo.isActive());
                            android.util.Log.d("VoucherActivity", "  - startDate: " + promo.getStartDate());
                            android.util.Log.d("VoucherActivity", "  - endDate: " + promo.getEndDate());
                            android.util.Log.d("VoucherActivity", "  - maxUses: " + promo.getMaxUses() + ", currentUses: " + promo.getCurrentUses());
                            android.util.Log.d("VoucherActivity", "  - isAvailable: " + promo.isAvailable());
                        }
                        
                        // Filter active promotions on client side
                        List<Promotion> activePromotions = filterActivePromotions(allPromotions);
                        android.util.Log.d("VoucherActivity", "Filtered to " + activePromotions.size() + " active promotions");
                        displayVouchers(activePromotions, true);
                    } else {
                        android.util.Log.w("VoucherActivity", "API response not successful or data is null");
                        android.util.Log.w("VoucherActivity", "Success: " + (apiResponse != null ? apiResponse.isSuccess() : "null"));
                        android.util.Log.w("VoucherActivity", "Data: " + (apiResponse != null && apiResponse.getData() != null ? "exists (" + apiResponse.getData().size() + " items)" : "null"));
                        if (apiResponse != null && apiResponse.getMessage() != null) {
                            android.util.Log.w("VoucherActivity", "Message: " + apiResponse.getMessage());
                        }
                        showNoVouchers(true);
                    }
                } else {
                    android.util.Log.e("VoucherActivity", "Response not successful: " + response.code());
                    if (response.errorBody() != null) {
                        try {
                            String errorBody = response.errorBody().string();
                            android.util.Log.e("VoucherActivity", "Error body: " + errorBody);
                        } catch (Exception e) {
                            android.util.Log.e("VoucherActivity", "Error reading error body", e);
                        }
                    }
                    showNoVouchers(true);
                }
            }

            @Override
            public void onFailure(retrofit2.Call<ApiResponse<List<Promotion>>> call, Throwable t) {
                android.util.Log.e("VoucherActivity", "=== Error loading vouchers ===", t);
                android.util.Log.e("VoucherActivity", "Error message: " + (t != null ? t.getMessage() : "Unknown"));
                showNoVouchers(true);
            }
        });
    }

    private List<Promotion> filterActivePromotions(List<Promotion> promotions) {
        if (promotions == null || promotions.isEmpty()) {
            android.util.Log.d("VoucherActivity", "filterActivePromotions: promotions list is null or empty");
            return new java.util.ArrayList<>();
        }
        
        android.util.Log.d("VoucherActivity", "filterActivePromotions: filtering " + promotions.size() + " promotions");
        List<Promotion> activePromotions = new java.util.ArrayList<>();
        
        for (Promotion promotion : promotions) {
            boolean isAvailable = promotion.isAvailable();
            android.util.Log.d("VoucherActivity", "Promotion " + promotion.getCode() + " - isAvailable: " + isAvailable);
            if (isAvailable) {
                activePromotions.add(promotion);
            } else {
                android.util.Log.d("VoucherActivity", "Promotion " + promotion.getCode() + " filtered out - isActive: " + promotion.isActive() + 
                    ", isExpired: " + promotion.isExpired());
            }
        }
        
        android.util.Log.d("VoucherActivity", "filterActivePromotions: result: " + activePromotions.size() + " active promotions");
        return activePromotions;
    }

    private void loadRedeemVouchers() {
        android.util.Log.d("VoucherActivity", "Loading redeem vouchers");
        ApiService apiService = ApiClient.getApiService(this);
        apiService.getPromotions().enqueue(new retrofit2.Callback<ApiResponse<List<Promotion>>>() {
            @Override
            public void onResponse(retrofit2.Call<ApiResponse<List<Promotion>>> call, 
                                 retrofit2.Response<ApiResponse<List<Promotion>>> response) {
                if (response.isSuccessful() && response.body() != null) {
                    ApiResponse<List<Promotion>> apiResponse = response.body();
                    if (apiResponse.isSuccess() && apiResponse.getData() != null) {
                        List<Promotion> promotions = apiResponse.getData();
                        android.util.Log.d("VoucherActivity", "Loaded " + promotions.size() + " promotions for redeem");
                        displayVouchers(promotions, false);
                    } else {
                        android.util.Log.w("VoucherActivity", "API response not successful");
                        showNoVouchers(false);
                    }
                } else {
                    android.util.Log.e("VoucherActivity", "Response not successful: " + response.code());
                    showNoVouchers(false);
                }
            }

            @Override
            public void onFailure(retrofit2.Call<ApiResponse<List<Promotion>>> call, Throwable t) {
                android.util.Log.e("VoucherActivity", "Error loading redeem vouchers", t);
                showNoVouchers(false);
            }
        });
    }

    private void displayVouchers(List<Promotion> promotions, boolean isMyVouchers) {
        android.util.Log.d("VoucherActivity", "=== displayVouchers ===");
        android.util.Log.d("VoucherActivity", "isMyVouchers: " + isMyVouchers);
        android.util.Log.d("VoucherActivity", "promotions count: " + (promotions != null ? promotions.size() : "null"));
        
        LinearLayout container = isMyVouchers ? vouchersContainer : redeemVouchersContainer;
        if (container == null) {
            android.util.Log.e("VoucherActivity", "Container is null!");
            return;
        }

        container.removeAllViews();
        android.util.Log.d("VoucherActivity", "Container cleared");

        if (promotions == null || promotions.isEmpty()) {
            android.util.Log.w("VoucherActivity", "No promotions to display");
            showNoVouchers(isMyVouchers);
            return;
        }

        android.util.Log.d("VoucherActivity", "Displaying " + promotions.size() + " vouchers");

        for (Promotion promotion : promotions) {
            View voucherView = getLayoutInflater().inflate(R.layout.item_voucher, container, false);
            
            TextView tvDiscountValue = voucherView.findViewById(R.id.tvDiscountValue);
            TextView tvVoucherName = voucherView.findViewById(R.id.tvVoucherName);
            TextView tvVoucherDescription = voucherView.findViewById(R.id.tvVoucherDescription);
            TextView tvExpiryDate = voucherView.findViewById(R.id.tvExpiryDate);
            TextView tvVoucherCode = voucherView.findViewById(R.id.tvVoucherCode);
            Button btnUseVoucher = voucherView.findViewById(R.id.btnUseVoucher);
            View voucherLeft = voucherView.findViewById(R.id.voucherLeft);

            // Set discount value
            String discountText = promotion.getFormattedDiscount();
            if (tvDiscountValue != null) {
                tvDiscountValue.setText(discountText);
            }

            // Set name
            if (tvVoucherName != null && promotion.getName() != null) {
                tvVoucherName.setText(promotion.getName());
            }

            // Set description
            if (tvVoucherDescription != null && promotion.getDescription() != null) {
                tvVoucherDescription.setText(promotion.getDescription());
            }

            // Set expiry date
            if (tvExpiryDate != null && promotion.getEndDate() != null) {
                try {
                    SimpleDateFormat inputFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
                    inputFormat.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));
                    Date endDate = inputFormat.parse(promotion.getEndDate());
                    if (endDate != null) {
                        SimpleDateFormat outputFormat = new SimpleDateFormat("dd/MM/yyyy", Locale.getDefault());
                        tvExpiryDate.setText("HSD: " + outputFormat.format(endDate));
                    }
                } catch (Exception e) {
                    android.util.Log.e("VoucherActivity", "Error parsing date", e);
                    tvExpiryDate.setText("HSD: N/A");
                }
            }

            // Set voucher code
            if (tvVoucherCode != null && promotion.getCode() != null) {
                tvVoucherCode.setText("Mã: " + promotion.getCode());
            }

            // Set button text and state
            if (btnUseVoucher != null) {
                if (isMyVouchers) {
                    btnUseVoucher.setText("Sử dụng");
                    btnUseVoucher.setOnClickListener(view -> {
                        android.widget.Toast.makeText(VoucherActivity.this, 
                            "Sử dụng voucher: " + promotion.getCode(), 
                            android.widget.Toast.LENGTH_SHORT).show();
                    });
                } else {
                    btnUseVoucher.setText("Đổi");
                    btnUseVoucher.setOnClickListener(view -> {
                        android.widget.Toast.makeText(VoucherActivity.this, 
                            "Đổi voucher: " + promotion.getCode(), 
                            android.widget.Toast.LENGTH_SHORT).show();
                    });
                }

                // Disable if expired or not available
                if (!promotion.isAvailable()) {
                    btnUseVoucher.setEnabled(false);
                    btnUseVoucher.setAlpha(0.6f);
                }
            }

            // Change background if expired
            if (promotion.isExpired() || !promotion.isActive()) {
                if (voucherLeft != null) {
                    voucherLeft.setBackgroundResource(R.drawable.bg_voucher_gray);
                }
            }

            container.addView(voucherView);
        }

        // Hide no vouchers message
        if (isMyVouchers && tvNoVouchers != null) {
            tvNoVouchers.setVisibility(View.GONE);
        } else if (!isMyVouchers && tvNoRedeemVouchers != null) {
            tvNoRedeemVouchers.setVisibility(View.GONE);
        }
    }

    private void showNoVouchers(boolean isMyVouchers) {
        LinearLayout container = isMyVouchers ? vouchersContainer : redeemVouchersContainer;
        if (container != null) {
            container.removeAllViews();
        }

        if (isMyVouchers && tvNoVouchers != null) {
            tvNoVouchers.setVisibility(View.VISIBLE);
        } else if (!isMyVouchers && tvNoRedeemVouchers != null) {
            tvNoRedeemVouchers.setVisibility(View.VISIBLE);
        }
    }

    private void updateTabState(boolean showMy,
                                View tabMy,
                                View tabRedeem,
                                View groupMy,
                                View groupRedeem) {
        if (groupMy != null) {
            groupMy.setVisibility(showMy ? View.VISIBLE : View.GONE);
        }
        if (groupRedeem != null) {
            groupRedeem.setVisibility(showMy ? View.GONE : View.VISIBLE);
        }

        if (tabMy != null) {
            tabMy.setBackgroundResource(showMy ? R.drawable.bg_tab_selected_red : R.drawable.bg_tab_unselected);
            tabMy.setElevation(showMy ? 4f : 0f);
            tabMy.setPadding(tabMy.getPaddingLeft(), tabMy.getPaddingTop(), tabMy.getPaddingRight(), tabMy.getPaddingBottom());
        }
        if (tabRedeem != null) {
            tabRedeem.setBackgroundResource(showMy ? R.drawable.bg_tab_unselected : R.drawable.bg_tab_selected_red);
            tabRedeem.setElevation(showMy ? 0f : 4f);
            tabRedeem.setPadding(tabRedeem.getPaddingLeft(), tabRedeem.getPaddingTop(), tabRedeem.getPaddingRight(), tabRedeem.getPaddingBottom());
        }

        int myColor = ContextCompat.getColor(this, showMy ? R.color.primary_red : R.color.neutral_text);
        int redeemColor = ContextCompat.getColor(this, showMy ? R.color.neutral_text : R.color.primary_red);

        if (tabMy instanceof android.widget.TextView) {
            android.widget.TextView textViewMy = (android.widget.TextView) tabMy;
            textViewMy.setTextColor(myColor);
        }
        if (tabRedeem instanceof android.widget.TextView) {
            android.widget.TextView textViewRedeem = (android.widget.TextView) tabRedeem;
            textViewRedeem.setTextColor(redeemColor);
        }
    }
}

