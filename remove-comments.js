const fs = require('fs');
const path = require('path');

// Function to remove comments from a file
function removeCommentsFromFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove single-line comments (// ...)
    content = content.replace(/\/\/[^\n]*/g, '');
    
    // Remove multi-line comments (/* ... */)
    content = content.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Remove empty lines
    content = content.replace(/^[\s\t\r\n]+/gm, '');
    
    // Write the cleaned content back to the file
    fs.writeFileSync(filePath, content.trim(), 'utf8');
    console.log(`✅ Đã xóa comment từ: ${filePath}`);
  } catch (error) {
    console.error(`❌ Lỗi khi xử lý ${filePath}:`, error.message);
  }
}

// Function to process all JS files in a directory
function processDirectory(directory) {
  try {
    const files = fs.readdirSync(directory);
    
    files.forEach(file => {
      const fullPath = path.join(directory, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        processDirectory(fullPath);
      } else if (file.endsWith('.js')) {
        removeCommentsFromFile(fullPath);
      }
    });
  } catch (error) {
    console.error(`❌ Lỗi khi đọc thư mục ${directory}:`, error.message);
  }
}

// Main execution
console.log('🚀 Bắt đầu xóa comment...');

const directoriesToProcess = [
  path.join(__dirname, 'controllers'),
  path.join(__dirname, 'routes'),
  path.join(__dirname, 'models'),
  path.join(__dirname, 'server.js')
];

// Create a backup directory
const backupDir = path.join(__dirname, 'backup_' + new Date().getTime());
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
  console.log(`🔒 Đã tạo thư mục sao lưu: ${backupDir}`);
}

// Process each directory/file
directoriesToProcess.forEach(item => {
  if (fs.existsSync(item)) {
    if (fs.statSync(item).isDirectory()) {
      // Copy directory to backup
      const destDir = path.join(backupDir, path.basename(item));
      copyDirSync(item, destDir);
      console.log(`📁 Đã sao lưu thư mục: ${item}`);
      
      // Process the directory
      processDirectory(item);
    } else {
      // Backup the file
      const destFile = path.join(backupDir, path.basename(item));
      fs.copyFileSync(item, destFile);
      console.log(`📄 Đã sao lưu file: ${item}`);
      
      // Process the file
      removeCommentsFromFile(item);
    }
  } else {
    console.warn(`⚠️  Đường dẫn không tồn tại: ${item}`);
  }
});

console.log('✅ Đã hoàn thành xóa comment!');
console.log(`💾 Bản sao lưu đã được lưu tại: ${backupDir}`);

// Helper function to copy directories recursively
function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
