package vchung.ph59842.app_datve;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

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
        View loginButton = findViewById(R.id.btnOpenLogin);
        View registerButton = findViewById(R.id.btnOpenRegister);
        View voucherNav = findViewById(R.id.navVoucher);

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
    }
}