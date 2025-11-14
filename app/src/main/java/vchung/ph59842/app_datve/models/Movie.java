package vchung.ph59842.app_datve.models;

import com.google.gson.annotations.SerializedName;
import java.util.List;

public class Movie {
    @SerializedName("_id")
    private String _id;
    
    @SerializedName("id")
    private String id;
    
    @SerializedName("title")
    private String title;
    
    @SerializedName("description")
    private String description;
    
    @SerializedName("posterUrl")
    private String posterUrl;
    
    @SerializedName("poster")
    private String poster;
    
    @SerializedName("trailerUrl")
    private String trailerUrl;
    
    @SerializedName("trailer")
    private String trailer;
    
    @SerializedName("duration")
    private int duration;
    
    @SerializedName("rating")
    private Object rating; // Có thể là String hoặc Number
    
    @SerializedName("genres")
    private List<String> genres;
    
    @SerializedName("genre")
    private List<String> genre;
    
    @SerializedName("releaseDate")
    private String releaseDate;
    
    @SerializedName("status")
    private String status; // showing, upcoming, early-showing

    public Movie() {}

    public String get_id() {
        return _id;
    }

    public void set_id(String _id) {
        this._id = _id;
    }

    public String getId() {
        // Ưu tiên trả về id, nếu không có thì trả về _id
        return id != null ? id : _id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getPosterUrl() {
        return posterUrl != null ? posterUrl : poster;
    }

    public void setPosterUrl(String posterUrl) {
        this.posterUrl = posterUrl;
    }

    public String getPoster() {
        return poster != null ? poster : posterUrl;
    }

    public void setPoster(String poster) {
        this.poster = poster;
    }

    public String getTrailerUrl() {
        return trailerUrl != null ? trailerUrl : trailer;
    }

    public void setTrailerUrl(String trailerUrl) {
        this.trailerUrl = trailerUrl;
    }

    public String getTrailer() {
        return trailer != null ? trailer : trailerUrl;
    }

    public void setTrailer(String trailer) {
        this.trailer = trailer;
    }

    public int getDuration() {
        return duration;
    }

    public void setDuration(int duration) {
        this.duration = duration;
    }

    public String getRating() {
        if (rating == null) {
            return null;
        }
        if (rating instanceof String) {
            return (String) rating;
        } else if (rating instanceof Number) {
            return String.valueOf(rating);
        }
        return rating.toString();
    }

    public void setRating(Object rating) {
        this.rating = rating;
    }

    public List<String> getGenre() {
        // Ưu tiên trả về genres (số nhiều), nếu không có thì trả về genre (số ít)
        return genres != null ? genres : genre;
    }

    public void setGenre(List<String> genre) {
        this.genre = genre;
    }
    
    public List<String> getGenres() {
        return genres != null ? genres : genre;
    }

    public void setGenres(List<String> genres) {
        this.genres = genres;
    }

    public String getReleaseDate() {
        return releaseDate;
    }

    public void setReleaseDate(String releaseDate) {
        this.releaseDate = releaseDate;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}

