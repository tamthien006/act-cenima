package vchung.ph59842.app_datve;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.widget.NestedScrollView;

public class MainActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_main);
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main), (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
            return insets;
        });

        View headerLoginButton = findViewById(R.id.btnHeaderLogin);
        NestedScrollView contentScroll = findViewById(R.id.contentScroll);
        View loginButton = findViewById(R.id.btnOpenLogin);
        View registerButton = findViewById(R.id.btnOpenRegister);
        View voucherNav = findViewById(R.id.navVoucher);
        View offersNav = findViewById(R.id.navOffers);
        View homeNav = findViewById(R.id.navHome);
        View scheduleNav = findViewById(R.id.navSchedule);
        View moreNav = findViewById(R.id.navMore);
        ImageView homeIcon = findViewById(R.id.navHomeIcon);
        TextView homeLabel = findViewById(R.id.navHomeLabel);
        ImageView scheduleIcon = findViewById(R.id.navScheduleIcon);
        TextView scheduleLabel = findViewById(R.id.navScheduleLabel);

        View.OnClickListener showLogin = view -> {
            Intent intent = new Intent(MainActivity.this, LoginActivity.class);
            startActivity(intent);
        };

        View.OnClickListener showRegister = view -> {
            Intent intent = new Intent(MainActivity.this, RegisterActivity.class);
            startActivity(intent);
        };

        if (headerLoginButton != null) {
            headerLoginButton.setOnClickListener(showLogin);
        }
        if (loginButton != null) {
            loginButton.setOnClickListener(showLogin);
        }
        if (registerButton != null) {
            registerButton.setOnClickListener(showRegister);
        }
        if (voucherNav != null) {
            voucherNav.setOnClickListener(view -> startActivity(VoucherActivity.createIntent(MainActivity.this)));
        }
        if (offersNav != null) {
            offersNav.setOnClickListener(view -> startActivity(OffersActivity.createIntent(MainActivity.this)));
        }
        if (homeNav != null) {
            homeNav.setOnClickListener(view -> {
                if (contentScroll != null) {
                    contentScroll.smoothScrollTo(0, 0);
                }
                updateNavSelection(true, homeIcon, homeLabel, scheduleIcon, scheduleLabel);
            });
        }
        if (scheduleNav != null) {
            scheduleNav.setOnClickListener(view -> {
                if (contentScroll != null) {
                    contentScroll.smoothScrollTo(0, 0);
                }
                updateNavSelection(false, homeIcon, homeLabel, scheduleIcon, scheduleLabel);
            });
        }
        if (moreNav != null) {
            moreNav.setOnClickListener(view -> startActivity(OthersActivity.createIntent(MainActivity.this)));
        }

        updateNavSelection(true, homeIcon, homeLabel, scheduleIcon, scheduleLabel);
    }

    private void updateNavSelection(boolean isHomeSelected,
                                    ImageView homeIcon,
                                    TextView homeLabel,
                                    ImageView scheduleIcon,
                                    TextView scheduleLabel) {
        if (homeIcon == null || homeLabel == null || scheduleIcon == null || scheduleLabel == null) {
            return;
        }

        int activeColor = ContextCompat.getColor(this, R.color.nav_active);
        int inactiveColor = ContextCompat.getColor(this, R.color.nav_inactive);

        homeIcon.setColorFilter(isHomeSelected ? activeColor : inactiveColor);
        homeLabel.setTextColor(isHomeSelected ? activeColor : inactiveColor);

        scheduleIcon.setColorFilter(isHomeSelected ? inactiveColor : activeColor);
        scheduleLabel.setTextColor(isHomeSelected ? inactiveColor : activeColor);
    }
}