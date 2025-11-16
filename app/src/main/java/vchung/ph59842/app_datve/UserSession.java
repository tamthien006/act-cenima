package vchung.ph59842.app_datve;

import android.content.Context;
import android.content.SharedPreferences;
import com.google.gson.Gson;
import vchung.ph59842.app_datve.api.ApiClient;
import vchung.ph59842.app_datve.models.User;

public class UserSession {
    private static final String PREF_NAME = "UserSession";
    private static final String KEY_IS_LOGGED_IN = "isLoggedIn";
    private static final String KEY_TOKEN = "token";
    private static final String KEY_USER = "user";

    private SharedPreferences sharedPreferences;
    private SharedPreferences.Editor editor;
    private Context context;
    private Gson gson;

    public UserSession(Context context) {
        this.context = context;
        sharedPreferences = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        editor = sharedPreferences.edit();
        gson = new Gson();
    }

    public void saveLoginSession(String token, User user) {
        // Trim token để loại bỏ khoảng trắng thừa
        String cleanToken = token != null ? token.trim() : null;
        android.util.Log.d("UserSession", "Saving token: " + (cleanToken != null ? cleanToken.substring(0, Math.min(20, cleanToken.length())) + "..." : "null"));
        
        editor.putBoolean(KEY_IS_LOGGED_IN, true);
        editor.putString(KEY_TOKEN, cleanToken);
        if (user != null) {
            String userJson = gson.toJson(user);
            editor.putString(KEY_USER, userJson);
            android.util.Log.d("UserSession", "Saving user: " + (user.getName() != null ? user.getName() : "no name"));
        } else {
            editor.remove(KEY_USER);
            android.util.Log.d("UserSession", "No user to save");
        }
        editor.commit();
    }

    public boolean isLoggedIn() {
        return sharedPreferences.getBoolean(KEY_IS_LOGGED_IN, false) && getToken() != null;
    }

    public String getToken() {
        String token = sharedPreferences.getString(KEY_TOKEN, null);
        if (token != null) {
            token = token.trim(); // Đảm bảo token không có khoảng trắng thừa
            android.util.Log.d("UserSession", "Retrieved token: " + token.substring(0, Math.min(20, token.length())) + "...");
        } else {
            android.util.Log.w("UserSession", "No token found in session");
        }
        return token;
    }

    public User getUser() {
        String userJson = sharedPreferences.getString(KEY_USER, null);
        if (userJson != null) {
            return gson.fromJson(userJson, User.class);
        }
        return null;
    }

    public String getUserName() {
        User user = getUser();
        return user != null ? user.getName() : "";
    }

    public String getUserEmail() {
        User user = getUser();
        return user != null ? user.getEmail() : "";
    }

    public void updateUser(User user) {
        String userJson = gson.toJson(user);
        editor.putString(KEY_USER, userJson);
        editor.commit();
    }

    public void logout() {
        editor.clear();
        editor.commit();
        ApiClient.reset();
    }
}
