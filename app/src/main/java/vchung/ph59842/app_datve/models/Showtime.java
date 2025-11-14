package vchung.ph59842.app_datve.models;

import com.google.gson.annotations.SerializedName;

public class Showtime {
    @SerializedName("_id")
    private String _id;
    
    @SerializedName("id")
    private String id;
    
    @SerializedName("movieId")
    private String movieId;
    
    @SerializedName("cinemaId")
    private String cinemaId;
    
    @SerializedName("cinemaName")
    private String cinemaName;
    
    @SerializedName("roomId")
    private String roomId;
    
    @SerializedName("roomName")
    private String roomName;
    
    @SerializedName("startTime")
    private String startTime;
    
    @SerializedName("endTime")
    private String endTime;
    
    @SerializedName("date")
    private String date;
    
    @SerializedName("price")
    private double price;
    
    @SerializedName("availableSeats")
    private int availableSeats;
    
    @SerializedName("totalSeats")
    private int totalSeats;
    
    @SerializedName("isAvailable")
    private boolean isAvailable;

    public Showtime() {}

    public String get_id() {
        return _id;
    }

    public void set_id(String _id) {
        this._id = _id;
    }

    public String getId() {
        return id != null ? id : _id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getMovieId() {
        return movieId;
    }

    public void setMovieId(String movieId) {
        this.movieId = movieId;
    }

    public String getCinemaId() {
        return cinemaId;
    }

    public void setCinemaId(String cinemaId) {
        this.cinemaId = cinemaId;
    }

    public String getCinemaName() {
        return cinemaName;
    }

    public void setCinemaName(String cinemaName) {
        this.cinemaName = cinemaName;
    }

    public String getRoomId() {
        return roomId;
    }

    public void setRoomId(String roomId) {
        this.roomId = roomId;
    }

    public String getRoomName() {
        return roomName;
    }

    public void setRoomName(String roomName) {
        this.roomName = roomName;
    }

    public String getStartTime() {
        return startTime;
    }

    public void setStartTime(String startTime) {
        this.startTime = startTime;
    }

    public String getEndTime() {
        return endTime;
    }

    public void setEndTime(String endTime) {
        this.endTime = endTime;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public double getPrice() {
        return price;
    }

    public void setPrice(double price) {
        this.price = price;
    }

    public int getAvailableSeats() {
        return availableSeats;
    }

    public void setAvailableSeats(int availableSeats) {
        this.availableSeats = availableSeats;
    }

    public int getTotalSeats() {
        return totalSeats;
    }

    public void setTotalSeats(int totalSeats) {
        this.totalSeats = totalSeats;
    }

    public boolean isAvailable() {
        return isAvailable;
    }

    public void setAvailable(boolean available) {
        isAvailable = available;
    }
    
    // Helper method to format time (e.g., "2024-01-10T09:00:00" -> "09:00")
    public String getFormattedTime() {
        if (startTime == null || startTime.isEmpty()) {
            return "";
        }
        try {
            // If time contains T, extract time part
            if (startTime.contains("T")) {
                String timePart = startTime.substring(startTime.indexOf("T") + 1);
                // Extract HH:mm
                if (timePart.length() >= 5) {
                    return timePart.substring(0, 5);
                }
            }
            return startTime;
        } catch (Exception e) {
            return startTime;
        }
    }
    
    // Helper method to format price
    public String getFormattedPrice() {
        return String.format("%.0f", price) + "₫";
    }
}


