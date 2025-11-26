package vchung.ph59842.app_datve;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.bumptech.glide.Glide;
import com.google.gson.Gson;

import java.util.List;

import vchung.ph59842.app_datve.api.ApiService;
import vchung.ph59842.app_datve.models.ApiResponse;
import vchung.ph59842.app_datve.models.Combo;

public class ComboSelectionActivity extends AppCompatActivity {
    private LinearLayout comboContainer;
    private ProgressBar progressBar;
    private TextView emptyText;
    private Button btnNoCombo;
    private String cinemaId;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_combo_selection);

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.comboSelectionRoot), (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
            return insets;
        });

        ImageView btnBack = findViewById(R.id.btnBackCombo);
        btnBack.setOnClickListener(v -> finish());

        comboContainer = findViewById(R.id.comboContainer);
        progressBar = findViewById(R.id.progressBar);
        emptyText = findViewById(R.id.emptyText);
        btnNoCombo = findViewById(R.id.btnNoCombo);

        cinemaId = getIntent().getStringExtra("cinemaId");

        btnNoCombo.setOnClickListener(v -> {
            Intent resultIntent = new Intent();
            setResult(RESULT_OK, resultIntent);
            finish();
        });

        loadCombos();
    }

    private void loadCombos() {
        progressBar.setVisibility(View.VISIBLE);
        comboContainer.setVisibility(View.GONE);
        emptyText.setVisibility(View.GONE);

        ApiService apiService = vchung.ph59842.app_datve.api.ApiClient.getApiService(this);
        retrofit2.Call<ApiResponse<List<Combo>>> call;
        
        if (cinemaId != null && !cinemaId.isEmpty()) {
            call = apiService.getAvailableCombos(cinemaId);
        } else {
            call = apiService.getCombos("active", null, 50);
        }

        call.enqueue(new retrofit2.Callback<ApiResponse<List<Combo>>>() {
            @Override
            public void onResponse(retrofit2.Call<ApiResponse<List<Combo>>> call,
                                 retrofit2.Response<ApiResponse<List<Combo>>> response) {
                progressBar.setVisibility(View.GONE);

                if (response.isSuccessful() && response.body() != null) {
                    ApiResponse<List<Combo>> apiResponse = response.body();
                    
                    if (apiResponse.isSuccess() && apiResponse.getData() != null) {
                        List<Combo> combos = apiResponse.getData();
                        
                        if (combos.isEmpty()) {
                            emptyText.setVisibility(View.VISIBLE);
                        } else {
                            displayCombos(combos);
                            comboContainer.setVisibility(View.VISIBLE);
                        }
                    } else {
                        emptyText.setVisibility(View.VISIBLE);
                    }
                } else {
                    emptyText.setVisibility(View.VISIBLE);
                    Toast.makeText(ComboSelectionActivity.this, "Không thể tải combo", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(retrofit2.Call<ApiResponse<List<Combo>>> call, Throwable t) {
                progressBar.setVisibility(View.GONE);
                emptyText.setVisibility(View.VISIBLE);
                Toast.makeText(ComboSelectionActivity.this, "Lỗi kết nối: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void displayCombos(List<Combo> combos) {
        comboContainer.removeAllViews();

        for (Combo combo : combos) {
            View comboView = getLayoutInflater().inflate(R.layout.item_combo, null);
            
            ImageView comboIcon = comboView.findViewById(R.id.comboIcon);
            TextView comboName = comboView.findViewById(R.id.comboName);
            TextView comboDescription = comboView.findViewById(R.id.comboDescription);
            TextView comboPrice = comboView.findViewById(R.id.comboPrice);
            Button btnSelect = comboView.findViewById(R.id.btnSelectCombo);

            comboName.setText(combo.getName());
            comboDescription.setText(combo.getFormattedDescription());
            comboPrice.setText(combo.getFormattedPrice());

            // Load combo image if available
            if (combo.getImageUrl() != null && !combo.getImageUrl().isEmpty()) {
                Glide.with(this)
                    .load(combo.getImageUrl())
                    .placeholder(R.drawable.ic_gift_orange)
                    .into(comboIcon);
            } else {
                comboIcon.setImageResource(R.drawable.ic_gift_orange);
            }

            btnSelect.setOnClickListener(v -> {
                Intent resultIntent = new Intent();
                resultIntent.putExtra("combo", new Gson().toJson(combo));
                setResult(RESULT_OK, resultIntent);
                finish();
            });

            comboContainer.addView(comboView);
        }
    }
}

