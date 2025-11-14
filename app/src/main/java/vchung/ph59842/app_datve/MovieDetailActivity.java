package vchung.ph59842.app_datve;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.bumptech.glide.Glide;
import com.google.gson.Gson;

import java.util.List;

import vchung.ph59842.app_datve.api.ApiService;
import vchung.ph59842.app_datve.models.Movie;
import vchung.ph59842.app_datve.models.Showtime;

public class MovieDetailActivity extends AppCompatActivity {

    private Movie movie;
    private ImageView moviePoster;
    private TextView movieTitle;
    private TextView movieDuration;
    private TextView movieReleaseDate;
    private TextView movieRating;
    private TextView movieDescription;
    private TextView movieAgeRating;
    private TextView movieHotBadge;
    // private Button btnWatchTrailer; // Temporarily disabled
    private android.widget.LinearLayout showtimesContainer;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_movie_detail);
        
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.movieDetailRoot), (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
            return insets;
        });

        // Get movie data from intent
        String movieJson = getIntent().getStringExtra("movie");
        if (movieJson != null) {
            android.util.Log.d("MovieDetailActivity", "Received movie JSON: " + movieJson);
            Gson gson = new Gson();
            movie = gson.fromJson(movieJson, Movie.class);
            
            if (movie != null) {
                android.util.Log.d("MovieDetailActivity", "Parsed movie - Title: " + movie.getTitle());
                android.util.Log.d("MovieDetailActivity", "Parsed movie - _id: " + movie.get_id());
                android.util.Log.d("MovieDetailActivity", "Parsed movie - id: " + movie.getId());
            }
        }

        if (movie == null) {
            android.util.Log.e("MovieDetailActivity", "Movie data is null, finishing activity");
            finish();
            return;
        }

        // Initialize views
        ImageView btnBack = findViewById(R.id.btnBack);
        moviePoster = findViewById(R.id.moviePoster);
        movieTitle = findViewById(R.id.movieTitle);
        movieDuration = findViewById(R.id.movieDuration);
        movieReleaseDate = findViewById(R.id.movieReleaseDate);
        movieRating = findViewById(R.id.movieRating);
        movieDescription = findViewById(R.id.movieDescription);
        movieAgeRating = findViewById(R.id.movieAgeRating);
        movieHotBadge = findViewById(R.id.movieHotBadge);
        // btnWatchTrailer = findViewById(R.id.btnWatchTrailer); // Temporarily disabled
        showtimesContainer = findViewById(R.id.showtimesContainer);

        // Back button
        if (btnBack != null) {
            btnBack.setOnClickListener(view -> finish());
        }

        // Load movie data
        loadMovieData();
        
        // Load showtimes
        loadShowtimes();

        // Watch trailer button - Temporarily disabled
        /*
        if (btnWatchTrailer != null) {
            btnWatchTrailer.setOnClickListener(view -> {
                String trailerUrl = movie.getTrailerUrl();
                android.util.Log.d("MovieDetailActivity", "Trailer URL: " + trailerUrl);
                
                if (trailerUrl != null && !trailerUrl.isEmpty()) {
                    try {
                        // Ensure URL has protocol
                        if (!trailerUrl.startsWith("http://") && !trailerUrl.startsWith("https://")) {
                            trailerUrl = "https://" + trailerUrl;
                        }
                        
                        Uri uri = Uri.parse(trailerUrl);
                        android.util.Log.d("MovieDetailActivity", "Parsed URI: " + uri.toString());
                        
                        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                        
                        // Check if there's an app that can handle this intent
                        if (intent.resolveActivity(getPackageManager()) != null) {
                            startActivity(intent);
                        } else {
                            android.util.Log.e("MovieDetailActivity", "No app found to handle trailer URL");
                            android.widget.Toast.makeText(this, "Không thể mở trailer. Vui lòng kiểm tra URL.", android.widget.Toast.LENGTH_SHORT).show();
                        }
                    } catch (Exception e) {
                        android.util.Log.e("MovieDetailActivity", "Error opening trailer", e);
                        android.widget.Toast.makeText(this, "Lỗi khi mở trailer: " + e.getMessage(), android.widget.Toast.LENGTH_SHORT).show();
                    }
                } else {
                    android.util.Log.w("MovieDetailActivity", "Trailer URL is null or empty");
                    android.widget.Toast.makeText(this, "Trailer không khả dụng", android.widget.Toast.LENGTH_SHORT).show();
                }
            });
        }
        */
    }

    private void loadMovieData() {
        if (movie == null) {
            return;
        }

        // Load poster
        String posterUrl = movie.getPosterUrl();
        if (posterUrl != null && !posterUrl.isEmpty()) {
            Glide.with(this)
                .load(posterUrl)
                .placeholder(android.R.color.darker_gray)
                .error(android.R.color.darker_gray)
                .into(moviePoster);
        }

        // Set title
        if (movie.getTitle() != null) {
            movieTitle.setText(movie.getTitle());
        }

        // Set duration
        if (movie.getDuration() > 0) {
            movieDuration.setText(movie.getDuration() + " phút");
        } else {
            movieDuration.setText("N/A");
        }

        // Set release date
        if (movie.getReleaseDate() != null && !movie.getReleaseDate().isEmpty()) {
            // Format date if needed (assuming format is YYYY-MM-DD or similar)
            String releaseDate = movie.getReleaseDate();
            // If date contains T (ISO format), extract date part
            if (releaseDate.contains("T")) {
                releaseDate = releaseDate.substring(0, releaseDate.indexOf("T"));
            }
            movieReleaseDate.setText("Khởi chiếu: " + releaseDate);
        } else {
            movieReleaseDate.setText("Khởi chiếu: N/A");
        }

        // Set rating
        String rating = movie.getRating();
        if (rating != null && !rating.isEmpty()) {
            try {
                double ratingValue = Double.parseDouble(rating);
                // Format rating (e.g., 8.5 -> "8.5/10")
                movieRating.setText(String.format("%.1f/10 (1,234 đánh giá)", ratingValue));
            } catch (NumberFormatException e) {
                movieRating.setText(rating + "/10");
            }
        } else {
            movieRating.setText("N/A");
        }

        // Set description
        if (movie.getDescription() != null && !movie.getDescription().isEmpty()) {
            movieDescription.setText(movie.getDescription());
        } else {
            movieDescription.setText("Chưa có mô tả cho phim này.");
        }

        // Set age rating (if available, use rating to determine)
        if (rating != null && !rating.isEmpty()) {
            try {
                double ratingValue = Double.parseDouble(rating);
                if (ratingValue >= 18) {
                    movieAgeRating.setText("T18");
                } else if (ratingValue >= 16) {
                    movieAgeRating.setText("T16");
                } else if (ratingValue >= 13) {
                    movieAgeRating.setText("T13");
                } else {
                    movieAgeRating.setText("P");
                }
            } catch (NumberFormatException e) {
                movieAgeRating.setText("T13");
            }
        } else {
            movieAgeRating.setText("T13");
        }

        // Show/hide HOT badge based on rating
        if (rating != null && !rating.isEmpty()) {
            try {
                double ratingValue = Double.parseDouble(rating);
                if (ratingValue >= 8.5) {
                    movieHotBadge.setVisibility(View.VISIBLE);
                } else {
                    movieHotBadge.setVisibility(View.GONE);
                }
            } catch (NumberFormatException e) {
                movieHotBadge.setVisibility(View.GONE);
            }
        } else {
            movieHotBadge.setVisibility(View.GONE);
        }
    }

    private void loadShowtimes() {
        if (movie == null) {
            android.util.Log.w("MovieDetailActivity", "Movie is null, cannot load showtimes");
            return;
        }

        // Try to get movie ID - prioritize _id if available
        String movieId = movie.get_id();
        if (movieId == null || movieId.isEmpty()) {
            movieId = movie.getId();
        }
        
        if (movieId == null || movieId.isEmpty()) {
            android.util.Log.e("MovieDetailActivity", "Movie ID is null or empty, cannot load showtimes");
            android.util.Log.d("MovieDetailActivity", "Movie _id: " + movie.get_id() + ", Movie id: " + movie.getId());
            showNoShowtimes();
            return;
        }

        android.util.Log.d("MovieDetailActivity", "Loading showtimes for movie ID: " + movieId);
        android.util.Log.d("MovieDetailActivity", "API endpoint: /api/v1/movies/" + movieId + "/showtimes");

        ApiService apiService = vchung.ph59842.app_datve.api.ApiClient.getApiService(this);
        apiService.getMovieShowtimes(movieId).enqueue(new retrofit2.Callback<vchung.ph59842.app_datve.models.ApiResponse<List<Showtime>>>() {
            @Override
            public void onResponse(retrofit2.Call<vchung.ph59842.app_datve.models.ApiResponse<List<Showtime>>> call, 
                                 retrofit2.Response<vchung.ph59842.app_datve.models.ApiResponse<List<Showtime>>> response) {
                android.util.Log.d("MovieDetailActivity", "Showtimes API response code: " + response.code());
                
                if (response.isSuccessful() && response.body() != null) {
                    vchung.ph59842.app_datve.models.ApiResponse<List<Showtime>> apiResponse = response.body();
                    
                    // Log response details
                    android.util.Log.d("MovieDetailActivity", "API response success: " + apiResponse.isSuccess());
                    android.util.Log.d("MovieDetailActivity", "API response message: " + (apiResponse.getMessage() != null ? apiResponse.getMessage() : "null"));
                    
                    // Serialize response back to JSON to see raw data
                    try {
                        Gson gson = new Gson();
                        String responseJson = gson.toJson(apiResponse);
                        android.util.Log.d("MovieDetailActivity", "API response JSON: " + responseJson);
                    } catch (Exception e) {
                        android.util.Log.w("MovieDetailActivity", "Could not serialize response", e);
                    }
                    
                    if (apiResponse.isSuccess() && apiResponse.getData() != null) {
                        List<Showtime> showtimes = apiResponse.getData();
                        android.util.Log.d("MovieDetailActivity", "Loaded " + showtimes.size() + " showtimes");
                        
                        // Log first showtime for debugging
                        if (!showtimes.isEmpty()) {
                            Showtime first = showtimes.get(0);
                            android.util.Log.d("MovieDetailActivity", "First showtime - Time: " + first.getStartTime() + 
                                ", Cinema: " + first.getCinemaName() + 
                                ", Room: " + first.getRoomName() + 
                                ", Price: " + first.getPrice());
                        } else {
                            android.util.Log.w("MovieDetailActivity", "Showtimes list is empty - server has no showtimes for this movie");
                        }
                        
                        displayShowtimes(showtimes);
                    } else {
                        android.util.Log.w("MovieDetailActivity", "API response not successful or data is null");
                        android.util.Log.w("MovieDetailActivity", "Response success: " + apiResponse.isSuccess() + 
                            ", Data null: " + (apiResponse.getData() == null));
                        showNoShowtimes();
                    }
                } else {
                    android.util.Log.e("MovieDetailActivity", "Failed to load showtimes: " + response.code());
                    
                    // Try to read error body
                    try {
                        if (response.errorBody() != null) {
                            String errorBody = response.errorBody().string();
                            android.util.Log.e("MovieDetailActivity", "Error body: " + errorBody);
                        }
                    } catch (Exception e) {
                        android.util.Log.e("MovieDetailActivity", "Error reading error body", e);
                    }
                    
                    showNoShowtimes();
                }
            }

            @Override
            public void onFailure(retrofit2.Call<vchung.ph59842.app_datve.models.ApiResponse<List<Showtime>>> call, 
                               Throwable t) {
                android.util.Log.e("MovieDetailActivity", "Network error loading showtimes", t);
                android.util.Log.e("MovieDetailActivity", "Error message: " + t.getMessage());
                if (t.getCause() != null) {
                    android.util.Log.e("MovieDetailActivity", "Cause: " + t.getCause().getMessage());
                }
                showNoShowtimes();
            }
        });
    }

    private void displayShowtimes(List<Showtime> showtimes) {
        if (showtimesContainer == null) {
            return;
        }

        showtimesContainer.removeAllViews();

        if (showtimes == null || showtimes.isEmpty()) {
            showNoShowtimes();
            return;
        }

        for (Showtime showtime : showtimes) {
            View showtimeView = getLayoutInflater().inflate(R.layout.item_showtime, showtimesContainer, false);
            
            TextView timeView = showtimeView.findViewById(R.id.showtimeTime);
            TextView cinemaView = showtimeView.findViewById(R.id.showtimeCinema);
            TextView priceView = showtimeView.findViewById(R.id.showtimePrice);
            Button bookButton = showtimeView.findViewById(R.id.btnBookTicket);

            // Set time
            String formattedTime = showtime.getFormattedTime();
            if (formattedTime != null && !formattedTime.isEmpty()) {
                timeView.setText(formattedTime);
            } else {
                timeView.setText("N/A");
            }

            // Set cinema name (with room name if available)
            String cinemaName = showtime.getCinemaName();
            String roomName = showtime.getRoomName();
            if (cinemaName != null && !cinemaName.isEmpty()) {
                if (roomName != null && !roomName.isEmpty()) {
                    cinemaView.setText(cinemaName + " - " + roomName);
                } else {
                    cinemaView.setText(cinemaName);
                }
            } else {
                cinemaView.setText("N/A");
            }

            // Set price
            priceView.setText(showtime.getFormattedPrice());

            // Set button state based on availability
            if (showtime.isAvailable() && showtime.getAvailableSeats() > 0) {
                bookButton.setText("Đặt vé");
                bookButton.setBackgroundResource(R.drawable.bg_primary_button);
                bookButton.setEnabled(true);
                bookButton.setOnClickListener(view -> {
                    // TODO: Navigate to booking screen
                    android.widget.Toast.makeText(MovieDetailActivity.this, 
                        "Đặt vé cho suất " + formattedTime, 
                        android.widget.Toast.LENGTH_SHORT).show();
                });
            } else {
                bookButton.setText("Hết vé");
                bookButton.setBackgroundResource(R.drawable.bg_primary_button);
                bookButton.setTextColor(androidx.core.content.ContextCompat.getColor(this, R.color.white));
                bookButton.setAlpha(0.6f); // Làm mờ một chút để thể hiện disabled state
                bookButton.setEnabled(false);
            }

            showtimesContainer.addView(showtimeView);
        }
    }

    private void showNoShowtimes() {
        if (showtimesContainer == null) {
            return;
        }

        showtimesContainer.removeAllViews();
        
        TextView noShowtimesText = new TextView(this);
        noShowtimesText.setText("Chưa có suất chiếu nào cho phim này.");
        noShowtimesText.setTextColor(androidx.core.content.ContextCompat.getColor(this, R.color.neutral_subtext));
        noShowtimesText.setTextSize(14);
        noShowtimesText.setPadding(0, 16, 0, 16);
        showtimesContainer.addView(noShowtimesText);
    }

    public static Intent createIntent(android.content.Context context, Movie movie) {
        Intent intent = new Intent(context, MovieDetailActivity.class);
        Gson gson = new Gson();
        String movieJson = gson.toJson(movie);
        intent.putExtra("movie", movieJson);
        return intent;
    }
}

