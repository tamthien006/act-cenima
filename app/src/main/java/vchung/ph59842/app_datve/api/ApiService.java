package vchung.ph59842.app_datve.api;

import java.util.List;
import java.util.Map;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.DELETE;
import retrofit2.http.GET;
import retrofit2.http.POST;
import retrofit2.http.PUT;
import retrofit2.http.Path;
import retrofit2.http.Query;
import vchung.ph59842.app_datve.models.ApiResponse;
import vchung.ph59842.app_datve.models.AuthResponse;
import vchung.ph59842.app_datve.models.LoginRequest;
import vchung.ph59842.app_datve.models.Movie;
import vchung.ph59842.app_datve.models.Promotion;
import vchung.ph59842.app_datve.models.RegisterRequest;
import vchung.ph59842.app_datve.models.User;

public interface ApiService {
    
    // Auth & Users
    @POST("auth/register")
    Call<AuthResponse> register(@Body RegisterRequest request);
    
    @POST("auth/login")
    Call<AuthResponse> login(@Body LoginRequest request);
    
    @GET("auth/me")
    Call<ApiResponse<User>> getMe();
    
    @PUT("auth/me")
    Call<ApiResponse<User>> updateProfile(@Body User user);
    
    @PUT("auth/password")
    Call<ApiResponse<Void>> changePassword(@Body Map<String, String> passwordData);
    
    // Movies
    @GET("movies")
    Call<ApiResponse<List<Movie>>> getMovies(
        @Query("page") Integer page,
        @Query("limit") Integer limit,
        @Query("sort") String sort,
        @Query("status") String status
    );
    
    @GET("movies/search")
    Call<ApiResponse<List<Movie>>> searchMovies(@Query("q") String query);
    
    @GET("movies/featured")
    Call<ApiResponse<List<Movie>>> getFeaturedMovies();
    
    @GET("movies")
    Call<ApiResponse<List<Movie>>> getNowShowingMovies(@Query("status") String status);
    
    @GET("movies/upcoming")
    Call<ApiResponse<List<Movie>>> getUpcomingMovies();
    
    @GET("movies/genre/{genre}")
    Call<ApiResponse<List<Movie>>> getMoviesByGenre(@Path("genre") String genre);
    
    @GET("movies/theater/{theaterId}")
    Call<ApiResponse<List<Movie>>> getMoviesByTheater(@Path("theaterId") String theaterId);
    
    @GET("movies/{id}")
    Call<ApiResponse<Movie>> getMovieDetail(@Path("id") String id);
    
    @GET("movies/{id}/showtimes")
    Call<ApiResponse<List<vchung.ph59842.app_datve.models.Showtime>>> getMovieShowtimes(@Path("id") String id);
    
    @GET("movies/{id}/availability")
    Call<ApiResponse<Object>> checkMovieAvailability(@Path("id") String id, @Query("showtimeId") String showtimeId);
    
    // Tickets
    @POST("tickets")
    Call<ApiResponse<Object>> bookTicket(@Body Map<String, Object> ticketData);
    
    @GET("tickets/me")
    Call<ApiResponse<List<Object>>> getMyTickets();
    
    @GET("tickets/{id}")
    Call<ApiResponse<Object>> getTicketDetail(@Path("id") String id);
    
    @PUT("tickets/{id}/cancel")
    Call<ApiResponse<Void>> cancelTicket(@Path("id") String id);
    
    @PUT("tickets/{id}/change-seats")
    Call<ApiResponse<Void>> changeSeats(@Path("id") String id, @Body Map<String, Object> seatData);
    
    // Reviews
    @GET("movies/{movieId}/reviews")
    Call<ApiResponse<List<Object>>> getMovieReviews(@Path("movieId") String movieId);
    
    @POST("reviews")
    Call<ApiResponse<Object>> addReview(@Body Map<String, Object> reviewData);
    
    @PUT("reviews/{id}")
    Call<ApiResponse<Object>> updateReview(@Path("id") String id, @Body Map<String, Object> reviewData);
    
    @DELETE("reviews/{id}")
    Call<ApiResponse<Void>> deleteReview(@Path("id") String id);
    
    @GET("users/me/reviews")
    Call<ApiResponse<List<Object>>> getMyReviews();
    
    // Cinemas
    @GET("cinemas")
    Call<ApiResponse<List<Object>>> getCinemas();
    
    @GET("cinemas/{id}")
    Call<ApiResponse<Object>> getCinemaDetail(@Path("id") String id);
    
    @GET("cinemas/{id}/rooms")
    Call<ApiResponse<List<Object>>> getCinemaRooms(@Path("id") String id);
    
    @GET("cinemas/{id}/showtimes")
    Call<ApiResponse<List<Object>>> getCinemaShowtimes(@Path("id") String id);
    
    // Payments
    @POST("payments/create")
    Call<ApiResponse<Object>> createPayment(@Body Map<String, Object> paymentData);
    
    @POST("payments/verify")
    Call<ApiResponse<Object>> verifyPayment(@Body Map<String, Object> verifyData);
    
    @GET("payments/{id}")
    Call<ApiResponse<Object>> getPaymentDetail(@Path("id") String id);
    
    @GET("payments/me")
    Call<ApiResponse<List<Object>>> getMyPayments();
    
    // Promotions
    @GET("promotions/active")
    Call<ApiResponse<List<Promotion>>> getPromotions();
    
    @GET("promotions/validate/{code}")
    Call<ApiResponse<Promotion>> validatePromotion(@Path("code") String code);
}

