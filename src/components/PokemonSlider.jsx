import { useState, useEffect } from 'react';
import axios from 'axios';
// Fix Swiper imports to work with the installed version
import { Swiper, SwiperSlide } from 'swiper/react';
// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
// Import required modules
import { Navigation, Pagination, Autoplay } from 'swiper/modules';

export default function PokemonSlider({ onSelect, selectedPokemon = null }) {
  const [pokemons, setPokemons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchPokemons() {
      try {
        setLoading(true);
        // Fetch 50 Pokemon for the slider
        const response = await axios.get('https://pokeapi.co/api/v2/pokemon?limit=50');
        const results = response.data.results;
        
        // Fetch details for each Pokemon to get their images
        const pokemonDetails = await Promise.all(
          results.map(async (pokemon) => {
            const detailResponse = await axios.get(pokemon.url);
            return {
              id: detailResponse.data.id,
              name: pokemon.name,
              image: detailResponse.data.sprites.other['official-artwork'].front_default || 
                    detailResponse.data.sprites.front_default
            };
          })
        );
        
        setPokemons(pokemonDetails);
      } catch (err) {
        console.error('Error fetching Pokemon:', err);
        setError('Failed to load Pokemon. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchPokemons();
  }, []);

  if (loading) {
    return <div className="pokemon-loading">Loading Pokemon...</div>;
  }

  if (error) {
    return <div className="pokemon-error">{error}</div>;
  }

  return (
    <div className="pokemon-slider-container">
      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        spaceBetween={20}
        slidesPerView={3}
        navigation
        pagination={{ clickable: true }}
        autoplay={{ delay: 3000, disableOnInteraction: false }}
        breakpoints={{
          640: {
            slidesPerView: 4,
            spaceBetween: 20,
          },
          768: {
            slidesPerView: 5,
            spaceBetween: 30,
          },
          1024: {
            slidesPerView: 6,
            spaceBetween: 30,
          },
        }}
        className="pokemon-swiper"
      >
        {pokemons.map((pokemon) => (
          <SwiperSlide key={pokemon.id}>            <div 
              className={`pokemon-slide ${selectedPokemon?.id === pokemon.id ? 'pokemon-selected' : ''}`}
              onClick={() => onSelect(pokemon)}
            >
              <img 
                src={pokemon.image} 
                alt={pokemon.name} 
                className="pokemon-image"
              />
              <p 
                className="pokemon-name" 
                style={{ 
                  fontFamily: "'Montserrat', 'Arial', sans-serif", 
                  fontSize: '1rem', 
                  fontWeight: '600',
                  textTransform: 'capitalize',
                  letterSpacing: '0.03em',
                  textShadow: selectedPokemon?.id === pokemon.id ? '0 0 8px rgba(99, 102, 241, 0.6)' : 'none',
                  color: selectedPokemon?.id === pokemon.id ? '#4338ca' : '#333',
                  margin: '8px 0 0 0',
                  padding: '4px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {pokemon.name}
              </p>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
