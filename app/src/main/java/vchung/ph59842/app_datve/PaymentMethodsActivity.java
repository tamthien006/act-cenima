package vchung.ph59842.app_datve;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.widget.RadioButton;
import android.widget.RadioGroup;
import android.widget.Toast;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import androidx.appcompat.app.AppCompatActivity;

import java.util.HashMap;
import java.util.Map;

import vchung.ph59842.app_datve.api.ApiClient;
import vchung.ph59842.app_datve.api.ApiService;
import vchung.ph59842.app_datve.models.ApiResponse;

public class PaymentMethodsActivity extends AppCompatActivity {
    private static final String PREF = "PaymentPrefs";
    private static final String KEY_DEFAULT_METHOD = "default_method";

    public static Intent createIntent(Context ctx){ return new Intent(ctx, PaymentMethodsActivity.class); }
    public static void setDefaultMethod(Context ctx, String method){
        SharedPreferences sp = ctx.getSharedPreferences(PREF, MODE_PRIVATE);
        sp.edit().putString(KEY_DEFAULT_METHOD, method).apply();
    }

    private void loadBanksFromServer() {
        try {
            String userId = new UserSession(this).getUserId();
            if (userId == null || userId.isEmpty()) return;
            ApiService api = ApiClient.getApiService(this);
            api.getUserBanks(userId).enqueue(new retrofit2.Callback<ApiResponse<java.util.List<java.util.Map<String, Object>>>>() {
                @Override public void onResponse(retrofit2.Call<ApiResponse<java.util.List<java.util.Map<String, Object>>>> call, retrofit2.Response<ApiResponse<java.util.List<java.util.Map<String, Object>>>> response) {
                    if (response.isSuccessful() && response.body()!=null && response.body().isSuccess()) {
                        java.util.List<java.util.Map<String, Object>> data = response.body().getData();
                        bankItems.clear();
                        if (data != null) bankItems.addAll(data);
                        if (bankAdapter != null) bankAdapter.notifyDataSetChanged();
                    }
                }
                @Override public void onFailure(retrofit2.Call<ApiResponse<java.util.List<java.util.Map<String, Object>>>> call, Throwable t) { }
            });
        } catch (Exception ignore) {}
    }

    private void saveBanksToServer() {
        try {
            String userId = new UserSession(this).getUserId();
            if (userId == null || userId.isEmpty()) { Toast.makeText(this, "Chưa đăng nhập", Toast.LENGTH_SHORT).show(); return; }
            ApiService api = ApiClient.getApiService(this);
            java.util.Map<String, Object> body = new java.util.HashMap<>();
            body.put("banks", bankItems);
            api.updateUserBanks(userId, body).enqueue(new retrofit2.Callback<ApiResponse<java.util.List<java.util.Map<String, Object>>>>() {
                @Override public void onResponse(retrofit2.Call<ApiResponse<java.util.List<java.util.Map<String, Object>>>> call, retrofit2.Response<ApiResponse<java.util.List<java.util.Map<String, Object>>>> response) {
                    if (response.isSuccessful() && response.body()!=null && response.body().isSuccess()) {
                        Toast.makeText(PaymentMethodsActivity.this, "Đã lưu tài khoản ngân hàng", Toast.LENGTH_SHORT).show();
                    } else {
                        Toast.makeText(PaymentMethodsActivity.this, "Lưu thất bại", Toast.LENGTH_SHORT).show();
                    }
                }
                @Override public void onFailure(retrofit2.Call<ApiResponse<java.util.List<java.util.Map<String, Object>>>> call, Throwable t) {
                    Toast.makeText(PaymentMethodsActivity.this, "Lỗi mạng khi lưu", Toast.LENGTH_SHORT).show();
                }
            });
        } catch (Exception ignore) {}
    }

    private void showAddBankDialog() {
        android.app.AlertDialog.Builder b = new android.app.AlertDialog.Builder(this);
        b.setTitle("Thêm tài khoản ngân hàng");
        android.widget.LinearLayout layout = new android.widget.LinearLayout(this);
        layout.setOrientation(android.widget.LinearLayout.VERTICAL);
        int pad = (int)(getResources().getDisplayMetrics().density * 16);
        layout.setPadding(pad, pad/2, pad, pad/2);
        final android.widget.EditText edBankName = new android.widget.EditText(this); edBankName.setHint("Ngân hàng (VD: VCB)");
        final android.widget.EditText edAccNo = new android.widget.EditText(this); edAccNo.setHint("Số tài khoản"); edAccNo.setInputType(android.text.InputType.TYPE_CLASS_NUMBER);
        final android.widget.EditText edAccName = new android.widget.EditText(this); edAccName.setHint("Chủ tài khoản");
        final android.widget.EditText edBranch = new android.widget.EditText(this); edBranch.setHint("Chi nhánh (tuỳ chọn)");
        layout.addView(edBankName); layout.addView(edAccNo); layout.addView(edAccName); layout.addView(edBranch);
        b.setView(layout);
        b.setNegativeButton("Hủy", (d,w)-> d.dismiss());
        b.setPositiveButton("Thêm", (d,w)->{
            java.util.Map<String,Object> m = new java.util.HashMap<>();
            m.put("bankName", edBankName.getText()!=null?edBankName.getText().toString().trim():"");
            m.put("accountNumber", edAccNo.getText()!=null?edAccNo.getText().toString().trim():"");
            m.put("accountName", edAccName.getText()!=null?edAccName.getText().toString().trim():"");
            m.put("branch", edBranch.getText()!=null?edBranch.getText().toString().trim():"");
            m.put("preferred", bankItems.isEmpty()); // chọn mặc định nếu là TK đầu tiên
            bankItems.add(m);
            if (bankAdapter != null) bankAdapter.notifyItemInserted(bankItems.size()-1);
        });
        b.show();
    }

    private class BankAdapter extends RecyclerView.Adapter<BankAdapter.VH> {
        @Override public VH onCreateViewHolder(android.view.ViewGroup parent, int viewType) {
            android.widget.LinearLayout row = new android.widget.LinearLayout(parent.getContext());
            row.setOrientation(android.widget.LinearLayout.VERTICAL);
            int p = (int)(parent.getResources().getDisplayMetrics().density * 12);
            row.setPadding(p,p,p,p);
            // line1: bankName • accountNumber
            android.widget.TextView tv1 = new android.widget.TextView(parent.getContext()); tv1.setId(1001);
            // line2: accountName
            android.widget.TextView tv2 = new android.widget.TextView(parent.getContext()); tv2.setId(1002);
            // actions: preferred checkbox + delete button
            android.widget.LinearLayout actions = new android.widget.LinearLayout(parent.getContext()); actions.setOrientation(android.widget.LinearLayout.HORIZONTAL);
            android.widget.CheckBox cbPref = new android.widget.CheckBox(parent.getContext()); cbPref.setText("Ưa thích"); cbPref.setId(1003);
            android.widget.Button btnDel = new android.widget.Button(parent.getContext()); btnDel.setText("Xoá"); btnDel.setId(1004);
            actions.addView(cbPref); actions.addView(btnDel);
            row.addView(tv1); row.addView(tv2); row.addView(actions);
            return new VH(row);
        }
        @Override public void onBindViewHolder(VH h, int pos) {
            java.util.Map<String,Object> m = bankItems.get(pos);
            String bankName = String.valueOf(m.get("bankName"));
            String accNo = String.valueOf(m.get("accountNumber"));
            String accName = String.valueOf(m.get("accountName"));
            boolean preferred = Boolean.TRUE.equals(m.get("preferred"));
            h.tv1.setText(bankName + " • " + accNo);
            h.tv2.setText(accName);
            h.cbPref.setOnCheckedChangeListener(null);
            h.cbPref.setChecked(preferred);
            h.cbPref.setOnCheckedChangeListener((buttonView, isChecked) -> {
                if (isChecked) {
                    // set only this item as preferred
                    for (int i=0;i<bankItems.size();i++) bankItems.get(i).put("preferred", i==pos);
                    notifyDataSetChanged();
                } else {
                    bankItems.get(pos).put("preferred", false);
                    notifyItemChanged(pos);
                }
            });
            h.btnDel.setOnClickListener(v -> {
                int p = h.getAdapterPosition();
                if (p>=0) {
                    bankItems.remove(p);
                    notifyItemRemoved(p);
                }
            });
        }
        @Override public int getItemCount() { return bankItems.size(); }
        class VH extends RecyclerView.ViewHolder {
            android.widget.TextView tv1, tv2; android.widget.CheckBox cbPref; android.widget.Button btnDel;
            VH(View v){ super(v);
                tv1 = v.findViewById(1001); tv2 = v.findViewById(1002); cbPref = v.findViewById(1003); btnDel = v.findViewById(1004);
            }
        }
    }
    public static String getDefaultMethod(Context ctx){
        SharedPreferences sp = ctx.getSharedPreferences(PREF, MODE_PRIVATE);
        return sp.getString(KEY_DEFAULT_METHOD, "vietqr");
    }

    private RadioGroup group;
    private RadioButton rbVietQr, rbManual, rbCash;
    private RecyclerView recyclerBanks;
    private View btnAddBank, btnSaveBanks;
    private final java.util.List<java.util.Map<String, Object>> bankItems = new java.util.ArrayList<>();
    private BankAdapter bankAdapter;

    @Override protected void onCreate(Bundle savedInstanceState){
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_payment_methods);
        findViewById(R.id.btnBackGeneric).setOnClickListener(v -> finish());
        group = findViewById(R.id.groupMethods);
        rbVietQr = findViewById(R.id.rbVietQr);
        rbManual = findViewById(R.id.rbManual);
        rbCash = findViewById(R.id.rbCash);
        recyclerBanks = findViewById(R.id.recyclerBanks);
        btnAddBank = findViewById(R.id.btnAddBank);
        btnSaveBanks = findViewById(R.id.btnSaveBanks);
        if (recyclerBanks != null) {
            recyclerBanks.setLayoutManager(new LinearLayoutManager(this));
            bankAdapter = new BankAdapter();
            recyclerBanks.setAdapter(bankAdapter);
        }

        // Load from backend first, fallback to local
        loadDefaultMethodFromServer();
        loadBanksFromServer();

        View btnSave = findViewById(R.id.btnSaveMethod);
        btnSave.setOnClickListener(v -> {
            String selected = getSelectedMethod();
            saveDefaultMethodToServer(selected);
        });

        if (btnAddBank != null) btnAddBank.setOnClickListener(v -> showAddBankDialog());
        if (btnSaveBanks != null) btnSaveBanks.setOnClickListener(v -> saveBanksToServer());
    }

    private String getSelectedMethod() {
        String selected = "vietqr";
        int id = group.getCheckedRadioButtonId();
        if (id == R.id.rbManual) selected = "manual";
        else if (id == R.id.rbCash) selected = "cash";
        return selected;
    }

    private void applyDefaultToUI(String method) {
        if ("vietqr".equalsIgnoreCase(method)) rbVietQr.setChecked(true);
        else if ("manual".equalsIgnoreCase(method)) rbManual.setChecked(true);
        else rbCash.setChecked(true);
    }

    private void loadDefaultMethodFromServer() {
        try {
            String userId = new UserSession(this).getUserId();
            if (userId == null || userId.isEmpty()) {
                String local = getDefaultMethod(this);
                applyDefaultToUI(local);
                return;
            }
            ApiService api = ApiClient.getApiService(this);
            api.getUserPaymentMethods(userId).enqueue(new retrofit2.Callback<ApiResponse<Map<String, Object>>>() {
                @Override public void onResponse(retrofit2.Call<ApiResponse<Map<String, Object>>> call, retrofit2.Response<ApiResponse<Map<String, Object>>> response) {
                    if (response.isSuccessful() && response.body()!=null && response.body().isSuccess()) {
                        Map<String, Object> data = response.body().getData();
                        String dm = data!=null && data.get("defaultMethod")!=null ? String.valueOf(data.get("defaultMethod")) : null;
                        if (dm == null || dm.isEmpty()) dm = getDefaultMethod(PaymentMethodsActivity.this);
                        setDefaultMethod(PaymentMethodsActivity.this, dm);
                        applyDefaultToUI(dm);
                    } else {
                        String local = getDefaultMethod(PaymentMethodsActivity.this);
                        applyDefaultToUI(local);
                    }
                }
                @Override public void onFailure(retrofit2.Call<ApiResponse<Map<String, Object>>> call, Throwable t) {
                    String local = getDefaultMethod(PaymentMethodsActivity.this);
                    applyDefaultToUI(local);
                }
            });
        } catch (Exception e) {
            String local = getDefaultMethod(this);
            applyDefaultToUI(local);
        }
    }

    private void saveDefaultMethodToServer(String method) {
        try {
            String userId = new UserSession(this).getUserId();
            if (userId == null || userId.isEmpty()) {
                setDefaultMethod(this, method);
                Toast.makeText(this, "Đã lưu (local): " + method, Toast.LENGTH_SHORT).show();
                finish();
                return;
            }
            ApiService api = ApiClient.getApiService(this);
            Map<String, Object> body = new HashMap<>();
            body.put("defaultMethod", method);
            api.updateUserPaymentMethods(userId, body).enqueue(new retrofit2.Callback<ApiResponse<Map<String, Object>>>() {
                @Override public void onResponse(retrofit2.Call<ApiResponse<Map<String, Object>>> call, retrofit2.Response<ApiResponse<Map<String, Object>>> response) {
                    if (response.isSuccessful() && response.body()!=null && response.body().isSuccess()) {
                        setDefaultMethod(PaymentMethodsActivity.this, method);
                        Toast.makeText(PaymentMethodsActivity.this, "Đã lưu phương thức: " + method, Toast.LENGTH_SHORT).show();
                        finish();
                    } else {
                        // fallback local
                        setDefaultMethod(PaymentMethodsActivity.this, method);
                        Toast.makeText(PaymentMethodsActivity.this, "Lưu local: " + method, Toast.LENGTH_SHORT).show();
                        finish();
                    }
                }
                @Override public void onFailure(retrofit2.Call<ApiResponse<Map<String, Object>>> call, Throwable t) {
                    setDefaultMethod(PaymentMethodsActivity.this, method);
                    Toast.makeText(PaymentMethodsActivity.this, "Lưu local (mạng lỗi): " + method, Toast.LENGTH_SHORT).show();
                    finish();
                }
            });
        } catch (Exception e) {
            setDefaultMethod(this, method);
            Toast.makeText(this, "Đã lưu (local)", Toast.LENGTH_SHORT).show();
            finish();
        }
    }
}
