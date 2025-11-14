package vchung.ph59842.app_datve;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.TextView;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

public class OffersActivity extends AppCompatActivity {

    public static Intent createIntent(Context context) {
        return new Intent(context, OffersActivity.class);
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_offers);

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.offersRoot), (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
            return insets;
        });

        View backButton = findViewById(R.id.btnBack);
        if (backButton != null) {
            backButton.setOnClickListener(view -> finish());
        }

        TextView tabAll = findViewById(R.id.tabAll);
        TextView tabMovie = findViewById(R.id.tabMovie);
        TextView tabCombo = findViewById(R.id.tabCombo);
        TextView tabMember = findViewById(R.id.tabMember);
        TextView tabEvent = findViewById(R.id.tabEvent);

        View groupAll = findViewById(R.id.groupAll);
        View groupMovie = findViewById(R.id.groupMovie);
        View groupCombo = findViewById(R.id.groupCombo);
        View groupMember = findViewById(R.id.groupMember);
        View groupEvent = findViewById(R.id.groupEvent);

        View.OnClickListener selectTab = view -> {
            updateTabState(tabAll, tabMovie, tabCombo, tabMember, tabEvent,
                    groupAll, groupMovie, groupCombo, groupMember, groupEvent,
                    (TextView) view);
        };

        if (tabAll != null) tabAll.setOnClickListener(selectTab);
        if (tabMovie != null) tabMovie.setOnClickListener(selectTab);
        if (tabCombo != null) tabCombo.setOnClickListener(selectTab);
        if (tabMember != null) tabMember.setOnClickListener(selectTab);
        if (tabEvent != null) tabEvent.setOnClickListener(selectTab);

        if (tabAll != null) {
            tabAll.post(() -> tabAll.performClick());
        }
    }

    private void updateTabState(TextView tabAll,
                                TextView tabMovie,
                                TextView tabCombo,
                                TextView tabMember,
                                TextView tabEvent,
                                View groupAll,
                                View groupMovie,
                                View groupCombo,
                                View groupMember,
                                View groupEvent,
                                TextView selectedTab) {

        setTabSelected(tabAll, groupAll, selectedTab == tabAll);
        setTabSelected(tabMovie, groupMovie, selectedTab == tabMovie);
        setTabSelected(tabCombo, groupCombo, selectedTab == tabCombo);
        setTabSelected(tabMember, groupMember, selectedTab == tabMember);
        setTabSelected(tabEvent, groupEvent, selectedTab == tabEvent);
    }

    private void setTabSelected(TextView tab, View group, boolean isSelected) {
        if (tab == null || group == null) return;

        tab.setBackgroundResource(isSelected ? R.drawable.bg_offer_chip_selected : R.drawable.bg_offer_chip_unselected);
        int textColor = ContextCompat.getColor(this, isSelected ? R.color.white : R.color.neutral_text);
        tab.setTextColor(textColor);
        group.setVisibility(isSelected ? View.VISIBLE : View.GONE);
    }
}

