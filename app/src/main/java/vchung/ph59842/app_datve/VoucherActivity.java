package vchung.ph59842.app_datve;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

public class VoucherActivity extends AppCompatActivity {

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

        View tabMy = findViewById(R.id.tabMyVoucher);
        View tabRedeem = findViewById(R.id.tabRedeemVoucher);
        View groupMy = findViewById(R.id.groupMyVoucher);
        View groupRedeem = findViewById(R.id.groupRedeemVoucher);

        View.OnClickListener selectMy = view -> updateTabState(true, tabMy, tabRedeem, groupMy, groupRedeem);
        View.OnClickListener selectRedeem = view -> updateTabState(false, tabMy, tabRedeem, groupMy, groupRedeem);

        if (tabMy != null) {
            tabMy.setOnClickListener(selectMy);
        }
        if (tabRedeem != null) {
            tabRedeem.setOnClickListener(selectRedeem);
        }

        updateTabState(true, tabMy, tabRedeem, groupMy, groupRedeem);
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

