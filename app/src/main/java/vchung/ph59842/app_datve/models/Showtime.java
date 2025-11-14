package vchung.ph59842.app_datve.models;

import com.google.gson.annotations.SerializedName;

public class Showtime {
    @SerializedName("_id")
    private String _id;
    
    @SerializedName("id")
    private String id;
    
    @SerializedName("movie")
    private String movie;
    
    @SerializedName("movieId")
    private String movieId;
    
    @SerializedName("theaterId")
    private String theaterId;
    
    @SerializedName("roomId")
    private String roomId;
    
    @SerializedName("theater")
    private Theater theater;
    
    @SerializedName("cinemaId")
    private String cinemaId;
    
    @SerializedName("cinemaName")
    private String cinemaName;
    
    @SerializedName("room")
    private Room room;
    
    // Make theater and room accessible for logging
    public Theater getTheater() {
        return theater;
    }
    
    public Room getRoom() {
        return room;
    }
    
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
    private Object availableSeats; // Can be array or number
    
    @SerializedName("totalSeats")
    private int totalSeats;
    
    @SerializedName("isActive")
    private boolean isActive;
    
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
        if (movieId != null && !movieId.isEmpty()) return movieId;
        if (movie != null && !movie.isEmpty()) return movie;
        return null;
    }

    public void setMovieId(String movieId) {
        this.movieId = movieId;
    }

    public String getCinemaId() {
        if (cinemaId != null && !cinemaId.isEmpty()) return cinemaId;
        if (theaterId != null && !theaterId.isEmpty()) return theaterId;
        if (theater != null && theater.get_id() != null) return theater.get_id();
        return null;
    }

    public void setCinemaId(String cinemaId) {
        this.cinemaId = cinemaId;
    }

    public String getCinemaName() {
        if (cinemaName != null && !cinemaName.isEmpty()) return cinemaName;
        if (theater != null && theater.getName() != null) return theater.getName();
        return null;
    }

    public void setCinemaName(String cinemaName) {
        this.cinemaName = cinemaName;
    }

    public String getRoomId() {
        if (roomId != null && !roomId.isEmpty()) return roomId;
        if (room != null && room.get_id() != null) return room.get_id();
        return null;
    }

    public void setRoomId(String roomId) {
        this.roomId = roomId;
    }

    public String getRoomName() {
        if (roomName != null && !roomName.isEmpty()) return roomName;
        if (room != null && room.getName() != null) return room.getName();
        return null;
    }

    public void setRoomName(String roomName) {
        this.roomName = roomName;
    }
    
    // Inner classes for nested objects
    public static class Theater {
        @SerializedName("_id")
        private String _id;
        
        @SerializedName("name")
        private String name;
        
        @SerializedName("address")
        private String address;
        
        @SerializedName("city")
        private String city;
        
        public String get_id() {
            return _id;
        }
        
        public void set_id(String _id) {
            this._id = _id;
        }
        
        public String getName() {
            return name;
        }
        
        public void setName(String name) {
            this.name = name;
        }
        
        public String getAddress() {
            return address;
        }
        
        public void setAddress(String address) {
            this.address = address;
        }
        
        public String getCity() {
            return city;
        }
        
        public void setCity(String city) {
            this.city = city;
        }
    }
    
    public static class Room {
        @SerializedName("_id")
        private String _id;
        
        @SerializedName("name")
        private String name;
        
        @SerializedName("capacity")
        private int capacity;
        
        public String get_id() {
            return _id;
        }
        
        public void set_id(String _id) {
            this._id = _id;
        }
        
        public String getName() {
            return name;
        }
        
        public void setName(String name) {
            this.name = name;
        }
        
        public int getCapacity() {
            return capacity;
        }
        
        public void setCapacity(int capacity) {
            this.capacity = capacity;
        }
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
        if (availableSeats == null) {
            return 0;
        }
        if (availableSeats instanceof java.util.List) {
            return ((java.util.List<?>) availableSeats).size();
        }
        if (availableSeats instanceof Number) {
            return ((Number) availableSeats).intValue();
        }
        return 0;
    }

    public void setAvailableSeats(Object availableSeats) {
        this.availableSeats = availableSeats;
    }

    public int getTotalSeats() {
        return totalSeats;
    }

    public void setTotalSeats(int totalSeats) {
        this.totalSeats = totalSeats;
    }

    public boolean isAvailable() {
        // Check isActive first, then isAvailable, then availableSeats
        if (!isActive) {
            return false;
        }
        if (isAvailable) {
            return true;
        }
        return getAvailableSeats() > 0;
    }

    public void setAvailable(boolean available) {
        isAvailable = available;
    }
    
    public boolean isActive() {
        return isActive;
    }
    
    public void setActive(boolean active) {
        isActive = active;
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


