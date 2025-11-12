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

import java.util.List;

import vchung.ph59842.app_datve.api.ApiService;
import vchung.ph59842.app_datve.models.Movie;
import vchung.ph59842.app_datve.models.User;

public class MainActivity extends AppCompatActivity {

    private UserSession userSession;
    private TextView tvUserName;
    private TextView tvUserStatus;
    private View btnHeaderLogin;
    private View authCtaContainer;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        userSession = new UserSession(this);
        
        // Kiểm tra đăng nhập: nếu chưa đăng nhập thì chuyển đến LoginActivity
        if (!userSession.isLoggedIn()) {
            android.util.Log.d("MainActivity", "User not logged in, redirecting to LoginActivity");
            Intent intent = new Intent(MainActivity.this, LoginActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
            startActivity(intent);
            finish();
            return;
        }
        
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_main);
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main), (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
            return insets;
        });

        tvUserName = findViewById(R.id.tvUserName);
        tvUserStatus = findViewById(R.id.tvUserStatus);
        btnHeaderLogin = findViewById(R.id.btnHeaderLogin);
        authCtaContainer = findViewById(R.id.authCtaContainer);

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

        // Update UI based on login status
        updateUserUI();
        
        // Nếu đã đăng nhập, kiểm tra xem có user trong session không
        // Nếu có tên rồi thì hiển thị ngay, nếu không thì gọi API /me
        if (userSession.isLoggedIn()) {
            User user = userSession.getUser();
            if (user != null && user.getName() != null && !user.getName().trim().isEmpty()) {
                // Đã có tên trong session, hiển thị ngay
                android.util.Log.d("MainActivity", "User name already in session: " + user.getName());
                if (tvUserName != null) {
                    tvUserName.setText("Chào " + user.getName().trim());
                }
            } else {
                // Chưa có tên, gọi API /me để lấy thông tin
                android.util.Log.d("MainActivity", "No user name in session, calling API /me");
                loadUserInfo();
            }
        }

        View.OnClickListener showLogin = view -> {
            Intent intent = new Intent(MainActivity.this, LoginActivity.class);
            startActivity(intent);
        };

        View.OnClickListener showRegister = view -> {
            Intent intent = new Intent(MainActivity.this, RegisterActivity.class);
            startActivity(intent);
        };

        if (btnHeaderLogin != null) {
            btnHeaderLogin.setOnClickListener(showLogin);
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

        // Load movies
        loadMovies();
    }

    @Override
    protected void onResume() {
        super.onResume();
        updateUserUI();
    }

    private void updateUserUI() {
        android.util.Log.d("MainActivity", "updateUserUI: isLoggedIn: " + userSession.isLoggedIn());
        
        if (userSession.isLoggedIn()) {
            User user = userSession.getUser();
            android.util.Log.d("MainActivity", "updateUserUI: User from session: " + (user != null ? "exists" : "null"));
            
            if (user != null) {
                android.util.Log.d("MainActivity", "updateUserUI: User name: " + (user.getName() != null ? user.getName() : "null"));
            }
            
            String userName = user != null && user.getName() != null ? user.getName().trim() : null;
            
            if (userName != null && !userName.isEmpty()) {
                // Có tên người dùng, hiển thị ngay
                android.util.Log.d("MainActivity", "updateUserUI: Displaying name: " + userName);
                if (tvUserName != null) {
                    tvUserName.setText("Chào " + userName);
                }
                if (tvUserStatus != null) {
                    tvUserStatus.setText("MEMBER");
                }
                if (authCtaContainer != null) {
                    authCtaContainer.setVisibility(View.GONE);
                }
            } else {
                // Chưa có tên, tạm thời hiển thị "Tài khoản" cho đến khi có dữ liệu
                // API /me sẽ được gọi trong onCreate() để lấy thông tin
                android.util.Log.d("MainActivity", "updateUserUI: No name yet, displaying 'Tài khoản'");
                if (tvUserName != null) {
                    tvUserName.setText("Tài khoản");
                }
                if (tvUserStatus != null) {
                    tvUserStatus.setText("MEMBER");
                }
                if (authCtaContainer != null) {
                    authCtaContainer.setVisibility(View.GONE);
                }
            }
        } else {
            if (tvUserName != null) {
                tvUserName.setText("Đăng nhập");
            }
            if (tvUserStatus != null) {
                tvUserStatus.setText("Đăng nhập để tích điểm và nhận ưu đãi");
            }
            if (authCtaContainer != null) {
                authCtaContainer.setVisibility(View.VISIBLE);
            }
        }
    }

    private void loadUserInfo() {
        if (!userSession.isLoggedIn()) {
            android.util.Log.d("MainActivity", "loadUserInfo: User not logged in, skipping");
            return;
        }
        
        android.util.Log.d("MainActivity", "loadUserInfo: Calling API /me");
        ApiService apiService = vchung.ph59842.app_datve.api.ApiClient.getApiService(this);
        apiService.getMe().enqueue(new retrofit2.Callback<vchung.ph59842.app_datve.models.ApiResponse<User>>() {
            @Override
            public void onResponse(retrofit2.Call<vchung.ph59842.app_datve.models.ApiResponse<User>> call, 
                                 retrofit2.Response<vchung.ph59842.app_datve.models.ApiResponse<User>> response) {
                android.util.Log.d("MainActivity", "loadUserInfo: Response code: " + response.code());
                android.util.Log.d("MainActivity", "loadUserInfo: Response isSuccessful: " + response.isSuccessful());
                android.util.Log.d("MainActivity", "loadUserInfo: Response body is null: " + (response.body() == null));
                
                if (response.isSuccessful() && response.body() != null) {
                    vchung.ph59842.app_datve.models.ApiResponse<User> apiResponse = response.body();
                    android.util.Log.d("MainActivity", "loadUserInfo: API success: " + apiResponse.isSuccess());
                    android.util.Log.d("MainActivity", "loadUserInfo: User data is null: " + (apiResponse.getData() == null));
                    
                    if (apiResponse.isSuccess() && apiResponse.getData() != null) {
                        User user = apiResponse.getData();
                        
                        // Log user details
                        android.util.Log.d("MainActivity", "loadUserInfo: User name: " + (user.getName() != null ? user.getName() : "null"));
                        android.util.Log.d("MainActivity", "loadUserInfo: User email: " + (user.getEmail() != null ? user.getEmail() : "null"));
                        
                        // Lưu thông tin user vào session
                        userSession.updateUser(user);
                        
                        // Cập nhật UI với tên người dùng ngay lập tức
                        String userName = user.getName() != null ? user.getName().trim() : null;
                        android.util.Log.d("MainActivity", "loadUserInfo: Processed userName: " + (userName != null ? userName : "null"));
                        
                        if (tvUserName != null && userName != null && !userName.isEmpty()) {
                            String displayText = "Chào " + userName;
                            android.util.Log.d("MainActivity", "loadUserInfo: Setting text to: " + displayText);
                            tvUserName.setText(displayText);
                        } else {
                            android.util.Log.w("MainActivity", "loadUserInfo: User name is null or empty, keeping 'Tài khoản'");
                            if (tvUserName != null) {
                                tvUserName.setText("Tài khoản");
                            }
                        }
                    } else {
                        android.util.Log.w("MainActivity", "loadUserInfo: API response not successful or data is null");
                    }
                } else {
                    android.util.Log.e("MainActivity", "loadUserInfo: Response not successful or body is null");
                    if (response.errorBody() != null) {
                        try {
                            String errorBody = response.errorBody().string();
                            android.util.Log.e("MainActivity", "loadUserInfo: Error body: " + errorBody);
                        } catch (Exception e) {
                            android.util.Log.e("MainActivity", "loadUserInfo: Error reading error body", e);
                        }
                    }
                    
                    // Nếu lỗi 401 (Unauthorized) hoặc 500 từ /auth/me, có thể token không hợp lệ
                    // Không logout ngay, chỉ log warning và giữ nguyên UI
                    if (response.code() == 401 || response.code() == 500) {
                        android.util.Log.w("MainActivity", "loadUserInfo: Token may be invalid (code: " + response.code() + "), but keeping session");
                        // Giữ nguyên UI hiện tại, không logout tự động
                    }
                }
            }

            @Override
            public void onFailure(retrofit2.Call<vchung.ph59842.app_datve.models.ApiResponse<User>> call, 
                               Throwable t) {
                // Lỗi khi gọi API /me, giữ nguyên UI hiện tại
                android.util.Log.e("MainActivity", "loadUserInfo: Network error: " + (t != null ? t.getMessage() : "Unknown"), t);
            }
        });
    }

    private void loadMovies() {
        ApiService apiService = vchung.ph59842.app_datve.api.ApiClient.getApiService(this);
        apiService.getNowShowingMovies("showing").enqueue(new retrofit2.Callback<vchung.ph59842.app_datve.models.ApiResponse<List<Movie>>>() {
            @Override
            public void onResponse(retrofit2.Call<vchung.ph59842.app_datve.models.ApiResponse<List<Movie>>> call, 
                                 retrofit2.Response<vchung.ph59842.app_datve.models.ApiResponse<List<Movie>>> response) {
                android.util.Log.d("MainActivity", "loadMovies: Response code: " + response.code());
                android.util.Log.d("MainActivity", "loadMovies: Response isSuccessful: " + response.isSuccessful());
                android.util.Log.d("MainActivity", "loadMovies: Response body is null: " + (response.body() == null));
                
                if (response.isSuccessful() && response.body() != null) {
                    vchung.ph59842.app_datve.models.ApiResponse<List<Movie>> apiResponse = response.body();
                    android.util.Log.d("MainActivity", "loadMovies: API success: " + apiResponse.isSuccess());
                    android.util.Log.d("MainActivity", "loadMovies: Data is null: " + (apiResponse.getData() == null));
                    
                    if (apiResponse.isSuccess() && apiResponse.getData() != null) {
                        List<Movie> movies = apiResponse.getData();
                        android.util.Log.d("MainActivity", "Loaded " + movies.size() + " movies");
                        
                        // Log first movie details for debugging
                        if (!movies.isEmpty()) {
                            Movie firstMovie = movies.get(0);
                            android.util.Log.d("MainActivity", "First movie - Title: " + firstMovie.getTitle());
                            android.util.Log.d("MainActivity", "First movie - PosterUrl: " + firstMovie.getPosterUrl());
                            android.util.Log.d("MainActivity", "First movie - Genre: " + firstMovie.getGenre());
                            android.util.Log.d("MainActivity", "First movie - Duration: " + firstMovie.getDuration());
                            android.util.Log.d("MainActivity", "First movie - Rating: " + firstMovie.getRating());
                        }
                        
                        bindMoviesToUI(movies);
                    } else {
                        android.util.Log.w("MainActivity", "API response not successful or data is null");
                        if (apiResponse.getMessage() != null) {
                            android.util.Log.w("MainActivity", "API message: " + apiResponse.getMessage());
                        }
                    }
                } else {
                    android.util.Log.e("MainActivity", "Failed to load movies: " + (response.errorBody() != null ? response.errorBody().toString() : "Unknown error"));
                    if (response.errorBody() != null) {
                        try {
                            String errorBody = response.errorBody().string();
                            android.util.Log.e("MainActivity", "Error body: " + errorBody);
                        } catch (Exception e) {
                            android.util.Log.e("MainActivity", "Error reading error body", e);
                        }
                    }
                }
            }

            @Override
            public void onFailure(retrofit2.Call<vchung.ph59842.app_datve.models.ApiResponse<List<Movie>>> call, 
                               Throwable t) {
                android.util.Log.e("MainActivity", "Network error loading movies", t);
            }
        });
    }

    private void bindMoviesToUI(List<Movie> movies) {
        if (movies == null || movies.isEmpty()) {
            android.util.Log.w("MainActivity", "No movies to display");
            return;
        }

        // Store movies list for click listeners
        this.moviesList = movies;

        // Bind movies to the 6 movie cards (max 6 movies)
        int maxMovies = Math.min(movies.size(), 6);
        for (int i = 0; i < maxMovies; i++) {
            Movie movie = movies.get(i);
            bindMovieToCard(movie, i + 1);
        }
    }
    
    private List<Movie> moviesList;

    private void bindMovieToCard(Movie movie, int cardIndex) {
        try {
            // Find views for this card
            ImageView posterView = findViewById(getResourceId("moviePoster" + cardIndex, "id"));
            TextView titleView = findViewById(getResourceId("movieTitle" + cardIndex, "id"));
            TextView infoView = findViewById(getResourceId("movieInfo" + cardIndex, "id"));
            TextView ratingView = findViewById(getResourceId("movieRating" + cardIndex, "id"));
            TextView hotView = findViewById(getResourceId("movieHot" + cardIndex, "id"));

            if (posterView == null || titleView == null || infoView == null) {
                android.util.Log.w("MainActivity", "Could not find views for card " + cardIndex);
                return;
            }

            // Find parent LinearLayout of the card to add click listener
            // The card structure is: LinearLayout (root) > FrameLayout > ImageView
            View parent = (View) posterView.getParent();
            View cardParent = parent != null ? (View) parent.getParent() : null;
            if (cardParent instanceof android.widget.LinearLayout) {
                final Movie movieToPass = movie; // Final reference for lambda
                cardParent.setOnClickListener(view -> {
                    Intent intent = MovieDetailActivity.createIntent(MainActivity.this, movieToPass);
                    startActivity(intent);
                });
                cardParent.setClickable(true);
                cardParent.setFocusable(true);
            }

            // Load poster image using Glide
            String posterUrl = movie.getPosterUrl();
            if (posterUrl != null && !posterUrl.isEmpty()) {
                com.bumptech.glide.Glide.with(this)
                    .load(posterUrl)
                    .placeholder(android.R.color.darker_gray)
                    .error(android.R.color.darker_gray)
                    .into(posterView);
            }

            // Set title
            if (movie.getTitle() != null) {
                titleView.setText(movie.getTitle());
            }

            // Build info string: genre • duration
            StringBuilder infoBuilder = new StringBuilder();
            if (movie.getGenre() != null && !movie.getGenre().isEmpty()) {
                infoBuilder.append(movie.getGenre().get(0));
                if (movie.getGenre().size() > 1) {
                    infoBuilder.append(", ").append(movie.getGenre().get(1));
                }
            }
            if (movie.getDuration() > 0) {
                if (infoBuilder.length() > 0) {
                    infoBuilder.append(" • ");
                }
                infoBuilder.append(movie.getDuration()).append("'");
            }
            infoView.setText(infoBuilder.toString());

            // Set rating
            if (ratingView != null) {
                String rating = movie.getRating();
                if (rating != null && !rating.isEmpty()) {
                    // Format rating (e.g., "9" -> "T9", "8.7" -> "T8.7")
                    try {
                        double ratingValue = Double.parseDouble(rating);
                        if (ratingValue >= 8.0) {
                            ratingView.setText("T" + (int)ratingValue);
                        } else {
                            ratingView.setText("T" + rating);
                        }
                    } catch (NumberFormatException e) {
                        ratingView.setText("T" + rating);
                    }
                } else {
                    ratingView.setText("T13"); // Default
                }
            }

            // Show/hide HOT badge based on rating or status
            if (hotView != null) {
                String rating = movie.getRating();
                boolean isHot = false;
                if (rating != null && !rating.isEmpty()) {
                    try {
                        double ratingValue = Double.parseDouble(rating);
                        isHot = ratingValue >= 8.5;
                    } catch (NumberFormatException e) {
                        // Keep default visibility
                    }
                }
                hotView.setVisibility(isHot ? View.VISIBLE : View.GONE);
            }

        } catch (Exception e) {
            android.util.Log.e("MainActivity", "Error binding movie to card " + cardIndex, e);
        }
    }

    private int getResourceId(String name, String type) {
        return getResources().getIdentifier(name, type, getPackageName());
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
