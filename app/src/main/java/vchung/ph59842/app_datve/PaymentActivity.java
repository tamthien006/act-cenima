package vchung.ph59842.app_datve;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.RadioButton;
import android.widget.RadioGroup;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.google.gson.Gson;

import vchung.ph59842.app_datve.models.Movie;
import vchung.ph59842.app_datve.models.Schedule;
import vchung.ph59842.app_datve.models.Ticket;

public class PaymentActivity extends AppCompatActivity {
    private TextView tvMovieName;
    private TextView tvShowtime;
    private TextView tvCinema;
    private TextView tvSeats;
    private TextView tvQuantity;
    private TextView tvTotal;
    private TextView tvCombo;
    private RadioGroup paymentMethodGroup;
    private Button btnPay;
    
    private Ticket ticket;
    private Movie movie;
    private Schedule schedule;
    private String selectedPaymentMethod = "momo";
    private double totalAmount;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_payment);

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.paymentRoot), (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
            return insets;
        });

        ImageView btnBack = findViewById(R.id.btnBackPayment);
        btnBack.setOnClickListener(v -> finish());

        tvMovieName = findViewById(R.id.tvMovieName);
        tvShowtime = findViewById(R.id.tvShowtime);
        tvCinema = findViewById(R.id.tvCinema);
        tvSeats = findViewById(R.id.tvSeats);
        tvQuantity = findViewById(R.id.tvQuantity);
        tvTotal = findViewById(R.id.tvTotal);
        tvCombo = findViewById(R.id.tvCombo);
        paymentMethodGroup = findViewById(R.id.paymentMethodGroup);
        btnPay = findViewById(R.id.btnPay);

        // Get data from intent
        String ticketJson = getIntent().getStringExtra("ticket");
        String movieJson = getIntent().getStringExtra("movie");
        String scheduleJson = getIntent().getStringExtra("schedule");

        if (ticketJson != null) {
            ticket = new Gson().fromJson(ticketJson, Ticket.class);
        }
        if (movieJson != null) {
            movie = new Gson().fromJson(movieJson, Movie.class);
        }
        if (scheduleJson != null) {
            schedule = new Gson().fromJson(scheduleJson, Schedule.class);
        }

        displayBookingInfo();
        setupPaymentMethods();

        btnPay.setOnClickListener(v -> processPayment());
    }

    private void displayBookingInfo() {
        if (movie != null) {
            tvMovieName.setText(movie.getTitle());
        }

        if (schedule != null) {
            tvShowtime.setText(schedule.getFormattedTime());
            // Parse cinema and room from notes (format: "CGV Nguyễn Du - Phòng 2")
            if (schedule.getNotes() != null && !schedule.getNotes().isEmpty()) {
                tvCinema.setText(schedule.getNotes().split(" - ")[0]);
            }
        } else if (ticket != null) {
            // Fallback to ticket data if schedule not available
            tvShowtime.setText("N/A");
        }

        if (ticket != null) {
            if (ticket.getSeatNumbers() != null && !ticket.getSeatNumbers().isEmpty()) {
                String seatsStr = String.join(", ", ticket.getSeatNumbers());
                tvSeats.setText(seatsStr);
            }
            
            int qty = ticket.getSeatNumbers() != null ? ticket.getSeatNumbers().size() : 1;
            tvQuantity.setText(qty + " vé");
            
            totalAmount = ticket.getFinalPrice();
            tvTotal.setText(String.format("%.0f₫", totalAmount));
            
            // Display combo if exists
            LinearLayout comboLayout = findViewById(R.id.comboInfoLayout);
            if (ticket.getCombo() != null && ticket.getCombo().getName() != null) {
                if (comboLayout != null) comboLayout.setVisibility(View.VISIBLE);
                tvCombo.setVisibility(View.VISIBLE);
                String comboText = ticket.getCombo().getName();
                if (ticket.getCombo().getQty() > 1) {
                    comboText += " x" + ticket.getCombo().getQty();
                }
                tvCombo.setText(comboText);
            } else {
                if (comboLayout != null) comboLayout.setVisibility(View.GONE);
                tvCombo.setVisibility(View.GONE);
            }
        }

        btnPay.setText("Thanh toán " + String.format("%.0f₫", totalAmount));
    }

    private void setupPaymentMethods() {
        paymentMethodGroup.setOnCheckedChangeListener((group, checkedId) -> {
            if (checkedId == R.id.radioMomo) {
                selectedPaymentMethod = "momo";
            } else if (checkedId == R.id.radioZaloPay) {
                selectedPaymentMethod = "zalopay";
            } else if (checkedId == R.id.radioVietQR) {
                selectedPaymentMethod = "vietqr";
            } else if (checkedId == R.id.radioInternetBanking) {
                selectedPaymentMethod = "internetbanking";
            } else if (checkedId == R.id.radioVisa) {
                selectedPaymentMethod = "visa";
            } else if (checkedId == R.id.radioATM) {
                selectedPaymentMethod = "atm";
            }
        });

        // Set default selection
        RadioButton radioMomo = findViewById(R.id.radioMomo);
        if (radioMomo != null) {
            radioMomo.setChecked(true);
        }

        // Make LinearLayouts clickable to select radio buttons
        setupPaymentMethodClickListeners();
    }

    private void setupPaymentMethodClickListeners() {
        // MoMo - find parent LinearLayout
        RadioButton radioMomo = findViewById(R.id.radioMomo);
        if (radioMomo != null && radioMomo.getParent() instanceof LinearLayout) {
            LinearLayout momoLayout = (LinearLayout) radioMomo.getParent();
            momoLayout.setOnClickListener(v -> radioMomo.setChecked(true));
        }

        // ZaloPay
        RadioButton radioZaloPay = findViewById(R.id.radioZaloPay);
        if (radioZaloPay != null && radioZaloPay.getParent() instanceof LinearLayout) {
            LinearLayout zaloPayLayout = (LinearLayout) radioZaloPay.getParent();
            zaloPayLayout.setOnClickListener(v -> radioZaloPay.setChecked(true));
        }

        // VietQR
        RadioButton radioVietQR = findViewById(R.id.radioVietQR);
        if (radioVietQR != null && radioVietQR.getParent() instanceof LinearLayout) {
            LinearLayout vietQRLayout = (LinearLayout) radioVietQR.getParent();
            vietQRLayout.setOnClickListener(v -> radioVietQR.setChecked(true));
        }

        // Internet Banking
        RadioButton radioInternetBanking = findViewById(R.id.radioInternetBanking);
        if (radioInternetBanking != null && radioInternetBanking.getParent() instanceof LinearLayout) {
            LinearLayout internetBankingLayout = (LinearLayout) radioInternetBanking.getParent();
            internetBankingLayout.setOnClickListener(v -> radioInternetBanking.setChecked(true));
        }

        // Visa
        RadioButton radioVisa = findViewById(R.id.radioVisa);
        if (radioVisa != null && radioVisa.getParent() instanceof LinearLayout) {
            LinearLayout visaLayout = (LinearLayout) radioVisa.getParent();
            visaLayout.setOnClickListener(v -> radioVisa.setChecked(true));
        }

        // ATM
        RadioButton radioATM = findViewById(R.id.radioATM);
        if (radioATM != null && radioATM.getParent() instanceof LinearLayout) {
            LinearLayout atmLayout = (LinearLayout) radioATM.getParent();
            atmLayout.setOnClickListener(v -> radioATM.setChecked(true));
        }
    }

    private void processPayment() {
        if (ticket == null) {
            Toast.makeText(this, "Không có thông tin vé", Toast.LENGTH_SHORT).show();
            return;
        }

        // TODO: Implement actual payment processing
        Toast.makeText(this, "Đang xử lý thanh toán qua " + selectedPaymentMethod, Toast.LENGTH_SHORT).show();
        
        // For now, just show success message
        // In real implementation, call payment API here
        android.util.Log.d("PaymentActivity", "Processing payment: " + selectedPaymentMethod);
        android.util.Log.d("PaymentActivity", "Ticket ID: " + ticket.getId());
        android.util.Log.d("PaymentActivity", "Amount: " + totalAmount);
    }
}

