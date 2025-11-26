package vchung.ph59842.app_datve.models;

import com.google.gson.annotations.SerializedName;
import java.util.List;

public class SeatMapResponse {
    @SerializedName("scheduleId")
    private String scheduleId;
    
    @SerializedName("roomId")
    private String roomId;
    
    @SerializedName("isFull")
    private boolean isFull;
    
    @SerializedName("seats")
    private List<Seat> seats;
    
    public SeatMapResponse() {}
    
    public String getScheduleId() {
        return scheduleId;
    }
    
    public void setScheduleId(String scheduleId) {
        this.scheduleId = scheduleId;
    }
    
    public String getRoomId() {
        return roomId;
    }
    
    public void setRoomId(String roomId) {
        this.roomId = roomId;
    }
    
    public boolean isFull() {
        return isFull;
    }
    
    public void setFull(boolean full) {
        isFull = full;
    }
    
    public List<Seat> getSeats() {
        return seats;
    }
    
    public void setSeats(List<Seat> seats) {
        this.seats = seats;
    }
}




