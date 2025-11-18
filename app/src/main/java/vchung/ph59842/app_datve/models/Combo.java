package vchung.ph59842.app_datve.models;

import com.google.gson.annotations.SerializedName;
import java.util.List;

public class Combo {
    @SerializedName("_id")
    private String _id;
    
    @SerializedName("id")
    private String id;
    
    @SerializedName("name")
    private String name;
    
    @SerializedName("description")
    private String description;
    
    @SerializedName("shortDescription")
    private String shortDescription;
    
    @SerializedName("price")
    private double price;
    
    @SerializedName("originalPrice")
    private Double originalPrice;
    
    @SerializedName("items")
    private List<ComboItem> items;
    
    @SerializedName("category")
    private String category; // combo, snack, beverage, dessert, meal
    
    @SerializedName("imageUrl")
    private String imageUrl;
    
    @SerializedName("isActive")
    private boolean isActive;
    
    @SerializedName("isFeatured")
    private boolean isFeatured;
    
    public Combo() {}
    
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
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public String getDescription() {
        return description;
    }
    
    public void setDescription(String description) {
        this.description = description;
    }
    
    public String getShortDescription() {
        return shortDescription;
    }
    
    public void setShortDescription(String shortDescription) {
        this.shortDescription = shortDescription;
    }
    
    public double getPrice() {
        return price;
    }
    
    public void setPrice(double price) {
        this.price = price;
    }
    
    public Double getOriginalPrice() {
        return originalPrice;
    }
    
    public void setOriginalPrice(Double originalPrice) {
        this.originalPrice = originalPrice;
    }
    
    public List<ComboItem> getItems() {
        return items;
    }
    
    public void setItems(List<ComboItem> items) {
        this.items = items;
    }
    
    public String getCategory() {
        return category;
    }
    
    public void setCategory(String category) {
        this.category = category;
    }
    
    public String getImageUrl() {
        return imageUrl;
    }
    
    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }
    
    public boolean isActive() {
        return isActive;
    }
    
    public void setActive(boolean active) {
        isActive = active;
    }
    
    public boolean isFeatured() {
        return isFeatured;
    }
    
    public void setFeatured(boolean featured) {
        isFeatured = featured;
    }
    
    public String getFormattedPrice() {
        return String.format(java.util.Locale.getDefault(), "%.0f", price) + "₫";
    }
    
    public String getFormattedDescription() {
        if (items != null && !items.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < items.size(); i++) {
                ComboItem item = items.get(i);
                if (i > 0) sb.append(" + ");
                sb.append(item.getQuantity());
                sb.append(" ");
                sb.append(item.getName());
                if (item.getDescription() != null && !item.getDescription().isEmpty()) {
                    sb.append(" ").append(item.getDescription());
                }
            }
            return sb.toString();
        }
        return description != null ? description : shortDescription;
    }
    
    public static class ComboItem {
        @SerializedName("name")
        private String name;
        
        @SerializedName("description")
        private String description;
        
        @SerializedName("quantity")
        private int quantity;
        
        public String getName() {
            return name;
        }
        
        public void setName(String name) {
            this.name = name;
        }
        
        public String getDescription() {
            return description;
        }
        
        public void setDescription(String description) {
            this.description = description;
        }
        
        public int getQuantity() {
            return quantity;
        }
        
        public void setQuantity(int quantity) {
            this.quantity = quantity;
        }
    }
}

