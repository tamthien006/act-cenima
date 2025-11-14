package vchung.ph59842.app_datve;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

public class OthersActivity extends AppCompatActivity {

    public static Intent createIntent(Context context) {
        return new Intent(context, OthersActivity.class);
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_others);

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.othersRoot), (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
            return insets;
        });

        View backButton = findViewById(R.id.btnBack);
        if (backButton != null) {
            backButton.setOnClickListener(view -> finish());
        }

        View navHome = findViewById(R.id.navHome);
        View navSchedule = findViewById(R.id.navSchedule);
        View navVoucher = findViewById(R.id.navVoucher);
        View navOffers = findViewById(R.id.navOffers);
        View navMore = findViewById(R.id.navMore);

        if (navHome != null) {
            navHome.setOnClickListener(view -> {
                Intent intent = new Intent(OthersActivity.this, MainActivity.class);
                intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                startActivity(intent);
            });
        }

        if (navSchedule != null) {
            navSchedule.setOnClickListener(view -> {
                Intent intent = new Intent(OthersActivity.this, MainActivity.class);
                intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                startActivity(intent);
            });
        }

        if (navVoucher != null) {
            navVoucher.setOnClickListener(view -> startActivity(VoucherActivity.createIntent(OthersActivity.this)));
        }

        if (navOffers != null) {
            navOffers.setOnClickListener(view -> startActivity(OffersActivity.createIntent(OthersActivity.this)));
        }

        if (navMore != null) {
            navMore.setOnClickListener(view -> {
                // Already on this screen
            });
        }

        // Member tile click listener - navigate to AccountActivity
        View tileMember = findViewById(R.id.tileMember);
        if (tileMember != null) {
            tileMember.setOnClickListener(view -> {
                Intent intent = AccountActivity.createIntent(OthersActivity.this);
                startActivity(intent);
            });
        }
    }
}

