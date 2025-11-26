package vchung.ph59842.app_datve;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import org.json.JSONObject;

import java.util.List;
import java.util.Locale;
import java.util.Map;

import vchung.ph59842.app_datve.api.ApiClient;
import vchung.ph59842.app_datve.api.ApiService;
import vchung.ph59842.app_datve.data.MembershipStore;
import vchung.ph59842.app_datve.models.ApiResponse;

public class MembershipActivity extends AppCompatActivity {

    public static Intent createIntent(Context ctx) {
        return new Intent(ctx, MembershipActivity.class);
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_membership);

        TextView tvTier = findViewById(R.id.tvTier);
        TextView tvPoints = findViewById(R.id.tvPoints);
        TextView tvSpent = findViewById(R.id.tvSpent);
        TextView tvNext = findViewById(R.id.tvNextTierProgress);
        ProgressBar progress = findViewById(R.id.progressTier);
        LinearLayout historyContainer = findViewById(R.id.historyContainer);

        String json = MembershipStore.getSnapshot(this);
        String tier = "basic";
        long points = 0;
        long totalSpent = 0;
        try {
            if (json != null) {
                JSONObject o = new JSONObject(json);
                tier = o.optString("tier", tier);
                points = o.optLong("points", 0);
                totalSpent = o.optLong("totalSpent", 0);
            }
        } catch (Exception ignore) {}

        if (tvTier != null) tvTier.setText(formatTier(tier));
        if (tvPoints != null) tvPoints.setText(String.format("%s điểm", formatNumber(points)));
        if (tvSpent != null) tvSpent.setText(String.format("Tổng chi tiêu: %s₫", formatNumber(totalSpent)));

        long nextThreshold = nextTierThreshold(totalSpent);
        int pct = 100;
        if (nextThreshold > 0) {
            pct = (int) Math.min(100, Math.max(0, Math.round(totalSpent * 100f / nextThreshold)));
            if (tvNext != null) tvNext.setText(String.format("%s / %s₫", formatNumber(totalSpent), formatNumber(nextThreshold)));
        } else {
            if (tvNext != null) tvNext.setText("Bạn đang ở hạng cao nhất");
        }
        if (progress != null) progress.setProgress(pct);

        // Fetch fresh data from API
        ApiService api = ApiClient.getApiService(this);
        api.getMyMembership().enqueue(new retrofit2.Callback<ApiResponse<Map<String, Object>>>() {
            @Override public void onResponse(retrofit2.Call<ApiResponse<Map<String, Object>>> call, retrofit2.Response<ApiResponse<Map<String, Object>>> response) {
                if (!response.isSuccessful() || response.body() == null || !response.body().isSuccess()) return;
                Map<String, Object> d = response.body().getData();
                if (d == null) return;
                try {
                    String t = String.valueOf(d.get("tier"));
                    long pts = d.get("points") instanceof Number ? ((Number) d.get("points")).longValue() : 0;
                    long spent = d.get("totalSpent") instanceof Number ? ((Number) d.get("totalSpent")).longValue() : 0;
                    String next = d.get("nextTier") != null ? String.valueOf(d.get("nextTier")) : null;
                    long needMore = d.get("needMore") instanceof Number ? ((Number) d.get("needMore")).longValue() : 0;

                    if (tvTier != null) tvTier.setText(formatTier(t));
                    if (tvPoints != null) tvPoints.setText(String.format(Locale.getDefault(), "%s điểm", formatNumber(pts)));
                    if (tvSpent != null) tvSpent.setText(String.format(Locale.getDefault(), "Tổng chi tiêu: %s₫", formatNumber(spent)));
                    int p = 100;
                    if (next != null && needMore > 0) {
                        long target = spent + needMore;
                        p = (int) Math.min(100, Math.max(0, Math.round(spent * 100f / target)));
                        if (tvNext != null) tvNext.setText(String.format(Locale.getDefault(), "%s / %s₫", formatNumber(spent), formatNumber(target)));
                    } else {
                        if (tvNext != null) tvNext.setText("Bạn đang ở hạng cao nhất");
                    }
                    if (progress != null) progress.setProgress(p);
                } catch (Exception ignore) {}
            }
            @Override public void onFailure(retrofit2.Call<ApiResponse<Map<String, Object>>> call, Throwable t) { }
        });

        api.getMyPointHistory().enqueue(new retrofit2.Callback<ApiResponse<List<Map<String, Object>>>>() {
            @Override public void onResponse(retrofit2.Call<ApiResponse<List<Map<String, Object>>>> call, retrofit2.Response<ApiResponse<List<Map<String, Object>>>> response) {
                if (historyContainer == null) return;
                historyContainer.removeAllViews();
                if (!response.isSuccessful() || response.body() == null || !response.body().isSuccess()) {
                    addHistoryEmpty(historyContainer);
                    return;
                }
                List<Map<String, Object>> items = response.body().getData();
                if (items == null || items.isEmpty()) { addHistoryEmpty(historyContainer); return; }
                for (Map<String, Object> it : items) addHistoryRow(historyContainer, it);
            }
            @Override public void onFailure(retrofit2.Call<ApiResponse<List<Map<String, Object>>>> call, Throwable t) {
                if (historyContainer != null) { historyContainer.removeAllViews(); addHistoryEmpty(historyContainer); }
            }
        });
    }

    private String formatNumber(long v) { return String.format(java.util.Locale.getDefault(), "%,d", v).replace(',', '.'); }

    private String formatTier(String t) {
        switch (String.valueOf(t).toLowerCase()) {
            case "silver": return "Silver";
            case "gold": return "Gold";
            case "platinum": return "Platinum";
            default: return "Basic";
        }
    }

    private long nextTierThreshold(long spent) {
        if (spent < 2_000_000) return 2_000_000;
        if (spent < 5_000_000) return 5_000_000;
        if (spent < 10_000_000) return 10_000_000;
        return 0; // top tier
    }

    private void addHistoryEmpty(LinearLayout container) {
        TextView tv = new TextView(this);
        tv.setText("Chưa có lịch sử điểm");
        tv.setTextSize(14f);
        tv.setTextColor(getResources().getColor(R.color.neutral_subtext));
        tv.setPadding(0, 12, 0, 12);
        container.addView(tv);
    }

    private void addHistoryRow(LinearLayout container, Map<String, Object> item) {
        View row = getLayoutInflater().inflate(android.R.layout.simple_list_item_2, container, false);
        TextView t1 = row.findViewById(android.R.id.text1);
        TextView t2 = row.findViewById(android.R.id.text2);
        String type = String.valueOf(item.get("type"));
        long pts = item.get("points") instanceof Number ? ((Number) item.get("points")).longValue() : 0;
        long amt = item.get("amount") instanceof Number ? ((Number) item.get("amount")).longValue() : 0;
        String line1 = ("earn".equals(type) ? "+" : "") + pts + " điểm";
        String line2 = String.format(Locale.getDefault(), "%s • %s₫", type, formatNumber(amt));
        t1.setText(line1);
        t2.setText(line2);
        container.addView(row);
    }
}
