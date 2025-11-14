package vchung.ph59842.app_datve;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
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
    private TextView tabUpcoming;
    private TextView tabNow;
    private TextView tabEarly;
    private String currentTab = "showing"; // Default to "ĐANG CHIẾU"

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
        
        // Add click listener to avatar and user name
        ImageView avatarView = findViewById(R.id.avatarView);
        
        View.OnClickListener openAccount = view -> {
            if (userSession.isLoggedIn()) {
                Intent intent = AccountActivity.createIntent(MainActivity.this);
                startActivity(intent);
            } else {
                Intent intent = new Intent(MainActivity.this, LoginActivity.class);
                startActivity(intent);
            }
        };
        
        // Set click listener on header area (avatar + name)
        View headerContainer = findViewById(R.id.headerContainer);
        if (headerContainer != null) {
            headerContainer.setOnClickListener(openAccount);
            headerContainer.setClickable(true);
        }
        
        if (tvUserName != null) {
            tvUserName.setOnClickListener(openAccount);
            tvUserName.setClickable(true);
        }
        
        if (avatarView != null) {
            avatarView.setOnClickListener(openAccount);
            avatarView.setClickable(true);
        }

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

        // Initialize tabs
        tabUpcoming = findViewById(R.id.tabUpcoming);
        tabNow = findViewById(R.id.tabNow);
        tabEarly = findViewById(R.id.tabEarly);

        // Set up tab click listeners
        if (tabUpcoming != null) {
            tabUpcoming.setOnClickListener(view -> switchTab("upcoming"));
        }
        if (tabNow != null) {
            tabNow.setOnClickListener(view -> switchTab("showing"));
        }
        if (tabEarly != null) {
            tabEarly.setOnClickListener(view -> switchTab("early"));
        }

        // Update tab UI to show default selected tab
        updateTabUI();

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

    private void switchTab(String tab) {
        if (tab.equals(currentTab)) {
            return; // Already on this tab
        }
        
        currentTab = tab;
        updateTabUI();
        loadMovies();
    }

    private void updateTabUI() {
        // Reset all tabs to unselected state
        if (tabUpcoming != null) {
            tabUpcoming.setBackgroundResource(R.drawable.bg_tab_unselected);
            tabUpcoming.setTextColor(ContextCompat.getColor(this, R.color.neutral_subtext));
            android.view.ViewGroup.MarginLayoutParams params = (android.view.ViewGroup.MarginLayoutParams) tabUpcoming.getLayoutParams();
            params.setMargins(0, 0, 0, 0);
            tabUpcoming.setLayoutParams(params);
        }
        
        if (tabNow != null) {
            tabNow.setBackgroundResource(R.drawable.bg_tab_unselected);
            tabNow.setTextColor(ContextCompat.getColor(this, R.color.neutral_subtext));
            android.view.ViewGroup.MarginLayoutParams params = (android.view.ViewGroup.MarginLayoutParams) tabNow.getLayoutParams();
            params.setMargins(0, 0, 0, 0);
            tabNow.setLayoutParams(params);
        }
        
        if (tabEarly != null) {
            tabEarly.setBackgroundResource(R.drawable.bg_tab_unselected);
            tabEarly.setTextColor(ContextCompat.getColor(this, R.color.neutral_subtext));
            android.view.ViewGroup.MarginLayoutParams params = (android.view.ViewGroup.MarginLayoutParams) tabEarly.getLayoutParams();
            params.setMargins(0, 0, 0, 0);
            tabEarly.setLayoutParams(params);
        }
        
        // Set selected tab
        TextView selectedTab = null;
        if (currentTab.equals("upcoming") && tabUpcoming != null) {
            selectedTab = tabUpcoming;
        } else if (currentTab.equals("showing") && tabNow != null) {
            selectedTab = tabNow;
        } else if (currentTab.equals("early") && tabEarly != null) {
            selectedTab = tabEarly;
        }
        
        if (selectedTab != null) {
            selectedTab.setBackgroundResource(R.drawable.bg_tab_selected);
            selectedTab.setTextColor(ContextCompat.getColor(this, R.color.tab_active));
            android.view.ViewGroup.MarginLayoutParams params = (android.view.ViewGroup.MarginLayoutParams) selectedTab.getLayoutParams();
            int margin = (int) (8 * getResources().getDisplayMetrics().density); // 8dp
            params.setMargins(margin, 0, margin, 0);
            selectedTab.setLayoutParams(params);
        }
    }

    private void loadMovies() {
        ApiService apiService = vchung.ph59842.app_datve.api.ApiClient.getApiService(this);
        
        retrofit2.Call<vchung.ph59842.app_datve.models.ApiResponse<List<Movie>>> call;
        
        if (currentTab.equals("upcoming")) {
            // Load upcoming movies
            call = apiService.getUpcomingMovies();
        } else if (currentTab.equals("early")) {
            // Load early showtimes - use showing movies with early showtimes filter
            // For now, we'll use showing movies and filter client-side
            call = apiService.getNowShowingMovies("showing");
        } else {
            // Default: showing movies
            call = apiService.getNowShowingMovies("showing");
        }
        
        call.enqueue(new retrofit2.Callback<vchung.ph59842.app_datve.models.ApiResponse<List<Movie>>>() {
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

        android.util.Log.d("MainActivity", "Binding " + movies.size() + " movies to UI");
        
        // Get the movie grid container
        android.widget.LinearLayout movieGrid = findViewById(R.id.movieGrid);
        if (movieGrid == null) {
            android.util.Log.e("MainActivity", "Movie grid container not found");
            return;
        }
        
        // Clear existing views
        movieGrid.removeAllViews();
        
        // Create rows of 2 movies each
        for (int i = 0; i < movies.size(); i += 2) {
            // Create a horizontal LinearLayout for each row
            android.widget.LinearLayout rowLayout = new android.widget.LinearLayout(this);
            rowLayout.setOrientation(android.widget.LinearLayout.HORIZONTAL);
            rowLayout.setLayoutParams(new android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
            ));
            
            if (i > 0) {
                // Add margin top for rows after the first
                android.widget.LinearLayout.LayoutParams params = (android.widget.LinearLayout.LayoutParams) rowLayout.getLayoutParams();
                params.topMargin = (int) (16 * getResources().getDisplayMetrics().density); // 16dp
                rowLayout.setLayoutParams(params);
            }
            
            // Add first movie in the row
            if (i < movies.size()) {
                View card1 = createMovieCard(movies.get(i), i);
                android.widget.LinearLayout.LayoutParams card1Params = new android.widget.LinearLayout.LayoutParams(
                    0,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
                    1.0f
                );
                card1Params.setMarginEnd((int) (12 * getResources().getDisplayMetrics().density)); // 12dp
                card1.setLayoutParams(card1Params);
                rowLayout.addView(card1);
            }
            
            // Add second movie in the row (if exists)
            if (i + 1 < movies.size()) {
                View card2 = createMovieCard(movies.get(i + 1), i + 1);
                android.widget.LinearLayout.LayoutParams card2Params = new android.widget.LinearLayout.LayoutParams(
                    0,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
                    1.0f
                );
                card2.setLayoutParams(card2Params);
                rowLayout.addView(card2);
            }
            
            movieGrid.addView(rowLayout);
        }
    }
    
    private View createMovieCard(Movie movie, int index) {
        // Inflate the movie card layout
        View cardView = getLayoutInflater().inflate(R.layout.view_movie_card_one, null);
        
        // Find views in the card
        ImageView posterView = cardView.findViewById(R.id.moviePoster1);
        TextView titleView = cardView.findViewById(R.id.movieTitle1);
        TextView infoView = cardView.findViewById(R.id.movieInfo1);
        TextView ratingView = cardView.findViewById(R.id.movieRating1);
        TextView hotView = cardView.findViewById(R.id.movieHot1);
        
        if (posterView == null || titleView == null || infoView == null) {
            android.util.Log.e("MainActivity", "Could not find views in movie card template");
            return cardView;
        }
        
        // Set click listener on the card
        cardView.setOnClickListener(view -> {
            Intent intent = MovieDetailActivity.createIntent(MainActivity.this, movie);
            startActivity(intent);
        });
        cardView.setClickable(true);
        cardView.setFocusable(true);
        
        // Load poster image using Glide
        String posterUrl = movie.getPosterUrl();
        if (posterUrl != null && !posterUrl.isEmpty()) {
            com.bumptech.glide.Glide.with(this)
                .load(posterUrl)
                .placeholder(android.R.color.darker_gray)
                .error(android.R.color.darker_gray)
                .into(posterView);
        } else {
            posterView.setImageResource(android.R.color.darker_gray);
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
        
        // Show/hide HOT badge based on rating
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
        
        return cardView;
    }
    
    private List<Movie> moviesList;
    
    private <T extends View> View findViewByType(ViewGroup parent, Class<T> type) {
        for (int i = 0; i < parent.getChildCount(); i++) {
            View child = parent.getChildAt(i);
            if (type.isInstance(child)) {
                return child;
            }
            if (child instanceof ViewGroup) {
                View found = findViewByType((ViewGroup) child, type);
                if (found != null) return found;
            }
        }
        return null;
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
