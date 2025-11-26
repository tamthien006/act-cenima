package vchung.ph59842.app_datve;

import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.google.gson.Gson;
import com.google.zxing.BarcodeFormat;
import com.journeyapps.barcodescanner.BarcodeEncoder;
import com.bumptech.glide.Glide;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import vchung.ph59842.app_datve.api.ApiClient;
import vchung.ph59842.app_datve.api.ApiService;
import vchung.ph59842.app_datve.models.ApiResponse;
import vchung.ph59842.app_datve.models.Ticket;
import vchung.ph59842.app_datve.data.MembershipStore;

public class PaymentCheckoutActivity extends AppCompatActivity {
    private TextView tvBankName, tvAccountNumber, tvAccountName, tvBranch, tvNote, tvQrCountdown, tvAmount, tvQrFallback;
    private ImageView imgQr;
    private Button btnIHavePaid, btnRegenerateQr;
    private ImageView btnBack;
    private android.view.View loadingOverlay;

    private Ticket ticket;
    private String method;
    private String cinemaIdExtra;
    private boolean settingsRequested = false;
    private int intentRetry = 0;

    private String currentIntentId = null;
    private long currentExpireAtMs = 0L;
    private final android.os.Handler countdownHandler = new android.os.Handler();
    private final Runnable countdownRunnable = new Runnable() {
        @Override public void run() {
            if (currentExpireAtMs <= 0 || tvQrCountdown == null) return;
            long remain = currentExpireAtMs - System.currentTimeMillis();
            if (remain <= 0) {
                tvQrCountdown.setText("QR đã hết hạn");
                if (btnIHavePaid != null) btnIHavePaid.setEnabled(false);
                return;
            }
            long s = remain / 1000; long m = s / 60; long ss = s % 60;
            tvQrCountdown.setText(String.format(java.util.Locale.getDefault(), "Hết hạn sau: %02d:%02d", m, ss));
            countdownHandler.postDelayed(this, 1000);
        }
    };

    // Polling confirm loop
    private final android.os.Handler confirmHandler = new android.os.Handler();
    private boolean isConfirming = false;
    private long confirmUntilMs = 0L;
    private final Runnable confirmRunnable = new Runnable() {
        @Override public void run() {
            if (!isConfirming) return;
            if (System.currentTimeMillis() > confirmUntilMs) {
                // timeout
                stopConfirmLoop();
                if (loadingOverlay != null) loadingOverlay.setVisibility(View.GONE);
                if (btnIHavePaid != null) btnIHavePaid.setEnabled(true);
                Toast.makeText(PaymentCheckoutActivity.this, "Hết thời gian chờ xác nhận. Vui lòng thử lại sau.", Toast.LENGTH_SHORT).show();
                return;
            }
            // fire one confirm request
            doConfirmOnce(false);
            // schedule next check in 5s
            confirmHandler.postDelayed(this, 5000);
        }
    };

    public static Intent createIntent(Context ctx, Ticket ticket, String method) {
        Intent i = new Intent(ctx, PaymentCheckoutActivity.class);
        i.putExtra("ticket", new Gson().toJson(ticket));
        i.putExtra("method", method);
        return i;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_payment_checkout);

        btnBack = findViewById(R.id.btnBackCheckout);
        btnBack.setOnClickListener(v -> finish());

        tvBankName = findViewById(R.id.tvBankName);
        tvAccountNumber = findViewById(R.id.tvAccountNumber);
        tvAccountName = findViewById(R.id.tvAccountName);
        tvBranch = findViewById(R.id.tvBranch);
        tvNote = findViewById(R.id.tvNote);
        imgQr = findViewById(R.id.imgQr);
        tvQrCountdown = findViewById(R.id.tvQrCountdown);
        tvAmount = findViewById(R.id.tvAmount);
        tvQrFallback = findViewById(R.id.tvQrFallback);
        btnIHavePaid = findViewById(R.id.btnIHavePaid);
        btnRegenerateQr = findViewById(R.id.btnRegenerateQr);
        loadingOverlay = findViewById(R.id.loadingOverlay);

        String tJson = getIntent().getStringExtra("ticket");
        if (tJson != null) ticket = new Gson().fromJson(tJson, Ticket.class);
        method = getIntent().getStringExtra("method");
        if (method == null) method = "vietqr";
        cinemaIdExtra = getIntent().getStringExtra("cinemaId");

        if (ticket == null || ticket.getId() == null) {
            Toast.makeText(this, "Thiếu thông tin vé", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        btnIHavePaid.setOnClickListener(v -> confirmPayment());
        btnRegenerateQr.setOnClickListener(v -> createPaymentIntent());

        View.OnClickListener copyListener = v -> {
            try {
                String text = null;
                if (v == tvAccountNumber) text = tvAccountNumber.getText().toString();
                else if (v == tvNote) text = tvNote.getText().toString();
                if (text != null && !text.isEmpty()) {
                    android.content.ClipboardManager cm = (android.content.ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                    cm.setPrimaryClip(android.content.ClipData.newPlainText("copied", text));
                    Toast.makeText(this, "Đã sao chép", Toast.LENGTH_SHORT).show();
                }
            } catch (Exception ignore) {}
        };
        tvAccountNumber.setOnClickListener(copyListener);
        tvNote.setOnClickListener(copyListener);

        createPaymentIntent();
    }

    private void createPaymentIntent() {
        ApiService api = ApiClient.getApiService(this);
        Map<String, Object> body = new HashMap<>();
        body.put("ticketId", ticket.getId());
        body.put("method", method);
        String manualNote = buildManualNote();
        if (manualNote != null && !manualNote.isEmpty()) body.put("note", manualNote);
        // Some backends require amount explicitly
        try {
            double ta = ticket.getTotalAmount() > 0 ? ticket.getTotalAmount() : ticket.getFinalPrice();
            if (ta <= 0) ta = ticket.getTotalPrice();
            if (ta > 0) body.put("amount", ta);
        } catch (Exception ignore) {}
        btnIHavePaid.setEnabled(false);
        api.createPaymentIntent(body).enqueue(new retrofit2.Callback<ApiResponse<Map<String, Object>>>() {
            @Override public void onResponse(retrofit2.Call<ApiResponse<Map<String, Object>>> call, retrofit2.Response<ApiResponse<Map<String, Object>>> response) {
                if (!response.isSuccessful() || response.body() == null || !response.body().isSuccess()) {
                    // Retry once or twice on 429 Too Many Requests
                    if (response.code() == 429 && intentRetry < 2) {
                        intentRetry++;
                        android.os.Handler h = new android.os.Handler();
                        h.postDelayed(() -> createPaymentIntent(), 1500L);
                        return;
                    }
                    String msg = "Tạo QR thất bại";
                    String detail = null;
                    try { if (response.errorBody() != null) detail = response.errorBody().string(); } catch (Exception ignore) {}
                    if (detail != null && !detail.isEmpty()) msg += ": " + detail;
                    android.util.Log.w("PaymentCheckout", "Create intent failed code=" + response.code() + " msg=" + msg);
                    Toast.makeText(PaymentCheckoutActivity.this, msg, Toast.LENGTH_SHORT).show();
                    // Show fallback on UI so user knows why
                    if (tvQrFallback != null) {
                        tvQrFallback.setText("" + (detail != null && !detail.isEmpty() ? detail : msg));
                        tvQrFallback.setVisibility(View.VISIBLE);
                    }
                    if (imgQr != null) imgQr.setVisibility(View.GONE);
                    return;
                }
                bindBankAndQr(response.body().getData());
                intentRetry = 0;
            }
            @Override public void onFailure(retrofit2.Call<ApiResponse<Map<String, Object>>> call, Throwable t) {
                Toast.makeText(PaymentCheckoutActivity.this, "Lỗi mạng: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void bindBankAndQr(Map<String, Object> data) {
        try {
            Map<String, Object> bank = (Map<String, Object>) data.get("bankInfo");
            String qrContent = asString(data.get("qrContent"));
            String qrImageUrl = asString(data.get("qrImageUrl"));
            Object expiresAt = data.get("expiresAt");
            Object intentId = data.get("intentId");
            currentIntentId = asString(intentId);
            // Amount: prefer intent amount, fallback to ticket
            String amountText = null;
            try {
                Object amt = data.get("amount");
                if (amt instanceof Number) {
                    amountText = String.format("Số tiền: %,.0f₫", ((Number) amt).doubleValue());
                } else if (amt instanceof String) {
                    double val = Double.parseDouble((String) amt);
                    amountText = String.format("Số tiền: %,.0f₫", val);
                }
            } catch (Exception ignore) {}
            if (amountText == null && ticket != null) {
                double ta = ticket.getTotalAmount() > 0 ? ticket.getTotalAmount() : ticket.getFinalPrice();
                if (ta <= 0) ta = ticket.getTotalPrice();
                amountText = String.format("Số tiền: %,.0f₫", ta);
            }
            if (tvAmount != null) {
                if (amountText != null) tvAmount.setText(amountText);
                else tvAmount.setText("Số tiền: --₫");
            }
            if (bank != null) {
                setText(tvBankName, asString(bank.get("bankName")));
                setText(tvAccountNumber, asString(bank.get("accountNumber")));
                setText(tvAccountName, asString(bank.get("accountName")));
                setText(tvBranch, asString(bank.get("branch")));
                if (tvQrFallback != null) tvQrFallback.setVisibility(View.GONE);
            }
            // Always fetch settings to ensure freshest bank info (cinema -> global) regardless of intent payload
            fetchFallbackSettings();
            String note = asString(data.get("note"));
            if (note == null || note.isEmpty()) note = buildManualNote();
            setText(tvNote, note);
            long expMs = parseExpiresAtToMillis(expiresAt);
            currentExpireAtMs = expMs;
            startCountdown();
            if ((qrContent == null || qrContent.isEmpty()) && (qrImageUrl != null && !qrImageUrl.isEmpty())) {
                if (tvQrFallback != null) tvQrFallback.setVisibility(View.GONE);
                if (imgQr != null) {
                    imgQr.setVisibility(View.VISIBLE);
                    try { Glide.with(this).load(qrImageUrl).into(imgQr); } catch (Exception e) { android.util.Log.e("PaymentCheckout", "Glide load qrImageUrl", e); }
                }
            } else if (qrContent == null || qrContent.isEmpty()) {
                if (imgQr != null) imgQr.setVisibility(View.GONE);
                if (tvQrFallback != null) {
                    tvQrFallback.setText("Chưa cấu hình tài khoản ngân hàng. Vui lòng liên hệ quản trị để cấu hình.");
                    tvQrFallback.setVisibility(View.VISIBLE);
                }
                if (btnIHavePaid != null) btnIHavePaid.setEnabled(false);
            } else {
                if (tvQrFallback != null) tvQrFallback.setVisibility(View.GONE);
                if (imgQr != null) imgQr.setVisibility(View.VISIBLE);
                renderQr(qrContent);
            }
            // Always allow user to tap; confirmPayment() will guard if missing intent
            if (btnIHavePaid != null) btnIHavePaid.setEnabled(true);
        } catch (Exception e) {
            android.util.Log.e("PaymentCheckout", "bindBankAndQr", e);
            Toast.makeText(this, "Không thể hiển thị QR", Toast.LENGTH_SHORT).show();
        }
    }

    private void fetchFallbackSettings() {
        try {
            if (settingsRequested) return;
            settingsRequested = true;
            ApiService api = ApiClient.getApiService(this);
            retrofit2.Call<ApiResponse<java.util.Map<String, Object>>> call = null;
            if (cinemaIdExtra != null && !cinemaIdExtra.isEmpty()) {
                call = api.getPaymentSettingsByCinema(cinemaIdExtra);
            } else {
                call = api.getPaymentSettings();
            }
            call.enqueue(new retrofit2.Callback<ApiResponse<java.util.Map<String, Object>>>() {
                @Override public void onResponse(retrofit2.Call<ApiResponse<java.util.Map<String, Object>>> call,
                                                 retrofit2.Response<ApiResponse<java.util.Map<String, Object>>> response) {
                    if (response.code() == 429) {
                        // retry after short delay
                        android.os.Handler h = new android.os.Handler();
                        settingsRequested = false;
                        h.postDelayed(() -> fetchFallbackSettings(), 1500L);
                        return;
                    }
                    if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                        java.util.Map<String, Object> doc = response.body().getData();
                        if (doc != null) {
                            setText(tvBankName, asString(doc.get("bankName")));
                            setText(tvAccountNumber, asString(doc.get("accountNumber")));
                            setText(tvAccountName, asString(doc.get("accountName")));
                            setText(tvBranch, asString(doc.get("branch")));
                            if (tvQrFallback != null) tvQrFallback.setVisibility(View.GONE);
                            String img = asString(doc.get("qrStaticUrl"));
                            if (img != null && !img.isEmpty() && img.startsWith("http")) {
                                try {
                                    Glide.with(PaymentCheckoutActivity.this).load(img).into(imgQr);
                                    if (imgQr!=null) imgQr.setVisibility(View.VISIBLE);
                                    if (tvQrFallback!=null) tvQrFallback.setVisibility(View.GONE);
                                } catch (Exception ignored) {}
                            }
                        } else {
                            // If cinema-scoped null, try global
                            if (cinemaIdExtra != null && !cinemaIdExtra.isEmpty()) {
                                ApiClient.getApiService(PaymentCheckoutActivity.this).getPaymentSettings().enqueue(this);
                            }
                        }
                    }
                }
                @Override public void onFailure(retrofit2.Call<ApiResponse<java.util.Map<String, Object>>> call, Throwable t) { /* ignore */ }
            });
        } catch (Exception ignore) {}
    }

    private String buildManualNote() {
        try {
            UserSession session = new UserSession(this);
            String base = session.getUserName();
            if (base == null || base.trim().isEmpty()) base = session.getUserEmail();
            if (base == null || base.trim().isEmpty()) {
                String uid = session.getUserId();
                if (uid != null && uid.length() > 4) base = "user" + uid.substring(uid.length() - 4);
                else base = "user";
            }
            base = base.replaceAll("\\s+", "").toLowerCase();
            String rnd = UUID.randomUUID().toString().replace("-", "").substring(0, 6).toLowerCase();
            return "act-" + base + "ck" + rnd;
        } catch (Exception e) {
            return "act-userck" + (int)(Math.random()*1000000);
        }
    }

    private void confirmPayment() {
        if (isConfirming) return; // avoid duplicate
        if (loadingOverlay != null) loadingOverlay.setVisibility(View.VISIBLE);
        if (btnIHavePaid != null) btnIHavePaid.setEnabled(false);
        // run an immediate confirm, then poll every 5s up to 2 minutes
        confirmUntilMs = System.currentTimeMillis() + 120_000L; // 2 minutes
        isConfirming = true;
        doConfirmOnce(true);
        confirmHandler.postDelayed(confirmRunnable, 5000);
    }

    private void doConfirmOnce(boolean stopOnSuccess) {
        ApiService api = ApiClient.getApiService(this);
        Map<String, Object> body = new HashMap<>();
        if (currentIntentId != null) body.put("intentId", currentIntentId);
        try { if (ticket != null && ticket.getId() != null) body.put("ticketId", ticket.getId()); } catch (Exception ignore) {}
        api.confirmQrPayment(body).enqueue(new retrofit2.Callback<ApiResponse<Map<String, Object>>>() {
            @Override public void onResponse(retrofit2.Call<ApiResponse<Map<String, Object>>> call, retrofit2.Response<ApiResponse<Map<String, Object>>> response) {
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    stopConfirmLoop();
                    if (loadingOverlay != null) loadingOverlay.setVisibility(View.GONE);
                    Toast.makeText(PaymentCheckoutActivity.this, "Thanh toán thành công", Toast.LENGTH_SHORT).show();
                    try {
                        String tId = ticket != null ? ticket.getId() : null;
                        double amt = 0;
                        try {
                            Map<String, Object> data = response.body().getData();
                            if (data != null && data.get("amount") instanceof Number) {
                                amt = ((Number) data.get("amount")).doubleValue();
                            } else if (ticket != null) {
                                amt = ticket.getTotalAmount() > 0 ? ticket.getTotalAmount() : ticket.getFinalPrice();
                                if (amt <= 0) amt = ticket.getTotalPrice();
                            }
                            // Save membership snapshot if present
                            if (data != null && data.get("membership") != null) {
                                try {
                                    String json = new com.google.gson.Gson().toJson(data.get("membership"));
                                    MembershipStore.saveSnapshot(PaymentCheckoutActivity.this, json);
                                } catch (Exception ignore) {}
                            }
                        } catch (Exception ignore) {}
                        Intent i = SuccessActivity.createIntent(PaymentCheckoutActivity.this, tId, amt);
                        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
                        startActivity(i);
                    } catch (Exception ignore) {}
                    finish();
                } else {
                    // keep polling until timeout
                }
            }
            @Override public void onFailure(retrofit2.Call<ApiResponse<Map<String, Object>>> call, Throwable t) {
                // ignore transient failure, next tick will retry
            }
        });
    }

    private void stopConfirmLoop() {
        isConfirming = false;
        confirmHandler.removeCallbacks(confirmRunnable);
        if (btnIHavePaid != null) btnIHavePaid.setEnabled(true);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        confirmHandler.removeCallbacks(confirmRunnable);
        countdownHandler.removeCallbacks(countdownRunnable);
    }

    private void startCountdown() {
        countdownHandler.removeCallbacks(countdownRunnable);
        countdownHandler.post(countdownRunnable);
    }

    private void renderQr(String content) {
        if (imgQr == null || content == null || content.isEmpty()) return;
        try {
            BarcodeEncoder encoder = new BarcodeEncoder();
            Bitmap bmp = encoder.encodeBitmap(content, BarcodeFormat.QR_CODE, 700, 700);
            imgQr.setImageBitmap(bmp);
        } catch (Exception e) {
            android.util.Log.e("PaymentCheckout", "renderQr", e);
        }
    }

    private long parseExpiresAtToMillis(Object expiresAt) {
        if (expiresAt == null) return 0L;
        try {
            if (expiresAt instanceof String) {
                java.time.Instant ins = java.time.Instant.parse((String) expiresAt);
                return ins.toEpochMilli();
            } else if (expiresAt instanceof Number) {
                long v = ((Number) expiresAt).longValue();
                if (v > 10_000_000_000L) return v; // ms
                return v * 1000L; // seconds
            }
        } catch (Exception ignore) {}
        return 0L;
    }

    private void setText(TextView v, String text) { if (v != null && text != null && !text.isEmpty()) v.setText(text); }
    private String asString(Object o) { return o == null ? null : String.valueOf(o); }
}
