import { FaWhatsapp, FaInstagram } from 'react-icons/fa';

const WEBSITE_URL = 'https://movies1-frontend.vercel.app/';

const ShareButtons = () => {
  const whatsappLink = `https://wa.me/?text=${encodeURIComponent(`Check out this site for movies: ${WEBSITE_URL}`)}`;

  return (
    <div className="flex gap-4 mt-4">
      {/* WhatsApp Share */}
      <a
        href={whatsappLink}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-3 py-2 rounded bg-green-500 text-white text-sm hover:bg-green-600 transition"
      >
        <FaWhatsapp /> Share on WhatsApp
      </a>

      {/* Instagram Info (not direct share) */}
      <a
        href="https://www.instagram.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-3 py-2 rounded bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm hover:opacity-90 transition"
      >
        <FaInstagram /> Share on Instagram
      </a>
    </div>
  );
};
