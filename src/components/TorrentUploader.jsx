import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-toastify';

const TorrentUploader = ({ onUpload }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) return toast.error("No file selected");

    const filename = file.name.replace(/[^a-z0-9_\-\.]/gi, '_');
    setUploading(true);

    const { data, error } = await supabase.storage
      .from('torrents') // 🧠 Make sure this bucket exists
      .upload(`files/${filename}`, file);

    setUploading(false);

    if (error) {
      toast.error("Upload failed");
      console.error("Supabase upload error:", error.message);
    } else {
      const { data: publicUrlData } = supabase
        .storage
        .from('torrents')
        .getPublicUrl(`files/${filename}`);
        
      toast.success("Uploaded!");
      if (onUpload) onUpload(publicUrlData.publicUrl);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <input type="file" accept=".torrent" onChange={(e) => setFile(e.target.files[0])} />
      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="bg-blue-600 px-4 py-2 rounded text-white"
      >
        {uploading ? "Uploading..." : "Upload .torrent"}
      </button>
    </div>
  );
};

export default TorrentUploader;
