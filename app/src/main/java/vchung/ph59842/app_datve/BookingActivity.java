package vchung.ph59842.app_datve;

import android.os.Bundle;
import android.view.View;
import android.widget.GridLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import android.widget.Button;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.bumptech.glide.Glide;
import com.google.gson.Gson;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import vchung.ph59842.app_datve.models.Movie;
import vchung.ph59842.app_datve.models.Showtime;

public class BookingActivity extends AppCompatActivity {

	private Movie movie;
	private Showtime showtime;

	private ImageView posterView;
	private TextView titleView;
	private TextView timeView;
	private TextView cinemaView;
	private TextView durationView;

	private TextView qtyText;
	private Button minusBtn;
	private Button plusBtn;
	private GridLayout seatGrid;
	private Button proceedBtn;
	private TextView totalPriceView;

	private int quantity = 1;
	private final Set<String> selectedSeats = new HashSet<>();

	@Override
	protected void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		EdgeToEdge.enable(this);
		setContentView(R.layout.activity_booking);

		ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.bookingRoot), (v, insets) -> {
			Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
			v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
			return insets;
		});

		ImageView btnBack = findViewById(R.id.btnBackBooking);
		btnBack.setOnClickListener(v -> finish());

		posterView = findViewById(R.id.bookingPoster);
		titleView = findViewById(R.id.bookingTitle);
		timeView = findViewById(R.id.bookingTime);
		cinemaView = findViewById(R.id.bookingCinema);
		durationView = findViewById(R.id.bookingDuration);
		qtyText = findViewById(R.id.qtyText);
		minusBtn = findViewById(R.id.btnMinus);
		plusBtn = findViewById(R.id.btnPlus);
		seatGrid = findViewById(R.id.seatGrid);
		proceedBtn = findViewById(R.id.btnProceed);
		totalPriceView = findViewById(R.id.totalPrice);

		// Receive data
		Gson gson = new Gson();
		String movieJson = getIntent().getStringExtra("movie");
		String showtimeJson = getIntent().getStringExtra("showtime");
		if (movieJson != null) movie = gson.fromJson(movieJson, Movie.class);
		if (showtimeJson != null) showtime = gson.fromJson(showtimeJson, Showtime.class);

		bindHeader();
		setupQuantity();
		buildSeatGrid();
		updateTotal();

		proceedBtn.setOnClickListener(v -> {
			if (selectedSeats.size() != quantity) {
				Toast.makeText(this, "Chọn đủ " + quantity + " ghế trước khi tiếp tục", Toast.LENGTH_SHORT).show();
				return;
			}
			// TODO: Navigate to payment screen. For now, just show a toast.
			Toast.makeText(this, "Tiếp tục thanh toán (" + quantity + " vé) - " + showtime.getFormattedPrice(), Toast.LENGTH_SHORT).show();
		});
	}

	private void bindHeader() {
		if (movie != null) {
			titleView.setText(movie.getTitle());
			durationView.setText(movie.getDuration() > 0 ? movie.getDuration() + " phút" : "");
			if (movie.getPosterUrl() != null && !movie.getPosterUrl().isEmpty()) {
				Glide.with(this).load(movie.getPosterUrl()).into(posterView);
			}
		}
		if (showtime != null) {
			timeView.setText(showtime.getFormattedTime());
			String cinemaLine = showtime.getCinemaName();
			if (cinemaLine == null || cinemaLine.isEmpty()) {
				cinemaLine = showtime.getAddress();
			}
			if (showtime.getRoomName() != null && !showtime.getRoomName().isEmpty()) {
				if (cinemaLine == null) cinemaLine = "";
				if (!cinemaLine.isEmpty()) cinemaLine += " - ";
				cinemaLine += showtime.getRoomName();
			}
			if (cinemaLine != null) cinemaView.setText(cinemaLine);
		}
	}

	private void setupQuantity() {
		qtyText.setText(String.valueOf(quantity));
		minusBtn.setOnClickListener(v -> {
			if (quantity > 1) {
				quantity--;
				qtyText.setText(String.valueOf(quantity));
				trimSelectedSeats();
				updateTotal();
			}
		});
		plusBtn.setOnClickListener(v -> {
			if (quantity < 10) {
				quantity++;
				qtyText.setText(String.valueOf(quantity));
				updateTotal();
			}
		});
	}

	private void updateTotal() {
		double price = showtime != null ? showtime.getPrice() : 0;
		double total = price * quantity;
		totalPriceView.setText(String.format("%.0f₫", total));
		proceedBtn.setText("Tiếp tục thanh toán - " + String.format("%.0f₫", total));
	}

	private void trimSelectedSeats() {
		// Keep only first N seats if over-selected
		if (selectedSeats.size() > quantity) {
			List<String> keep = new ArrayList<>(selectedSeats).subList(0, quantity);
			selectedSeats.clear();
			selectedSeats.addAll(keep);
			refreshSeatSelection();
		}
	}

	private void buildSeatGrid() {
		// Simple 8 rows (A-H), 10 seats each (1-10)
		char[] rows = {'A','B','C','D','E','F','G','H'};
		int cols = 10;
		seatGrid.removeAllViews();
		seatGrid.setColumnCount(11); // 1 for row label + 10 seats

		for (char row : rows) {
			// Row label
			TextView label = createLabel(String.valueOf(row));
			seatGrid.addView(label);
			for (int i = 1; i <= cols; i++) {
				final String seatId = row + String.valueOf(i);
				Button seatBtn = createSeatButton(seatId);
				seatBtn.setOnClickListener(v -> toggleSeat(seatId, seatBtn));
				seatGrid.addView(seatBtn);
			}
		}
	}

	private TextView createLabel(String text) {
		TextView tv = new TextView(this);
		GridLayout.LayoutParams lp = new GridLayout.LayoutParams();
		lp.width = GridLayout.LayoutParams.WRAP_CONTENT;
		lp.height = GridLayout.LayoutParams.WRAP_CONTENT;
		lp.setMargins(8, 8, 8, 8);
		tv.setLayoutParams(lp);
		tv.setText(text);
		return tv;
	}

	private Button createSeatButton(String seatId) {
		Button b = new Button(this);
		GridLayout.LayoutParams lp = new GridLayout.LayoutParams();
		lp.width = (int) (getResources().getDisplayMetrics().density * 36);
		lp.height = (int) (getResources().getDisplayMetrics().density * 36);
		lp.setMargins(6, 6, 6, 6);
		b.setLayoutParams(lp);
		b.setText(seatId.substring(1)); // show number only
		b.setAllCaps(false);
		styleSeat(b, false, false);
		return b;
	}

	private void styleSeat(Button b, boolean selected, boolean sold) {
		if (sold) {
			b.setEnabled(false);
			b.setAlpha(0.5f);
			b.setBackgroundResource(android.R.drawable.btn_default);
		} else if (selected) {
			b.setEnabled(true);
			b.setAlpha(1f);
			b.setBackgroundColor(androidx.core.content.ContextCompat.getColor(this, R.color.secondaryColor));
			b.setTextColor(androidx.core.content.ContextCompat.getColor(this, R.color.white));
		} else {
			b.setEnabled(true);
			b.setAlpha(1f);
			b.setBackgroundResource(android.R.drawable.btn_default);
		}
	}

	private void toggleSeat(String seatId, Button view) {
		boolean isSelected = selectedSeats.contains(seatId);
		if (isSelected) {
			selectedSeats.remove(seatId);
			styleSeat(view, false, false);
	} else {
			if (selectedSeats.size() >= quantity) {
				Toast.makeText(this, "Bạn đã chọn đủ " + quantity + " ghế", Toast.LENGTH_SHORT).show();
				return;
			}
			selectedSeats.add(seatId);
			styleSeat(view, true, false);
		}
	}

	private void refreshSeatSelection() {
		// Iterate children to reflect selectedSeats
		for (int i = 0; i < seatGrid.getChildCount(); i++) {
			View v = seatGrid.getChildAt(i);
			if (v instanceof Button) {
				Button b = (Button) v;
				// Reconstruct id from position is complex; skip for simplicity
			}
		}
	}

	public static android.content.Intent createIntent(android.content.Context ctx, Movie movie, Showtime showtime) {
		android.content.Intent intent = new android.content.Intent(ctx, BookingActivity.class);
		Gson gson = new Gson();
		intent.putExtra("movie", gson.toJson(movie));
		intent.putExtra("showtime", gson.toJson(showtime));
		return intent;
	}
}


