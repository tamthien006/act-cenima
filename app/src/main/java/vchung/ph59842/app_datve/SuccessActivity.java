package vchung.ph59842.app_datve;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

public class SuccessActivity extends AppCompatActivity {
    public static final String EXTRA_TICKET_ID = "ticketId";
    public static final String EXTRA_AMOUNT = "amount";

    public static Intent createIntent(Context ctx, String ticketId, double amount) {
        Intent i = new Intent(ctx, SuccessActivity.class);
        i.putExtra(EXTRA_TICKET_ID, ticketId);
        i.putExtra(EXTRA_AMOUNT, amount);
        return i;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_success);

        TextView tvTitle = findViewById(R.id.tvSuccessTitle);
        TextView tvAmount = findViewById(R.id.tvSuccessAmount);
        Button btnViewTicket = findViewById(R.id.btnViewTicket);
        Button btnMyTickets = findViewById(R.id.btnMyTickets);

        String ticketId = getIntent().getStringExtra(EXTRA_TICKET_ID);
        double amount = 0;
        try { amount = getIntent().getDoubleExtra(EXTRA_AMOUNT, 0); } catch (Exception ignore) {}

        if (tvTitle != null) tvTitle.setText("Thanh toán thành công");
        if (tvAmount != null) tvAmount.setText(String.format(java.util.Locale.getDefault(), "Số tiền: %,.0f₫", amount));

        btnViewTicket.setOnClickListener(v -> {
            if (ticketId != null && !ticketId.isEmpty()) {
                // Mở màn check-in và giữ SuccessActivity trong back stack để quay lại được
                Intent i = TicketCheckinActivity.createIntent(SuccessActivity.this, ticketId);
                startActivity(i);
            }
        });
        btnMyTickets.setOnClickListener(v -> {
            startActivity(MyTicketsActivity.createIntent(SuccessActivity.this));
            finish();
        });
    }
}
