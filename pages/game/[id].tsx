import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import { GameLoader } from '@/components/GameLoader';
import { ThemeToggle } from '@/components/ThemeToggle';
import { PlayerNameButton } from '@/components/PlayerNameButton';
import { gamesList } from '@/data/games';

export default function GamePage() {
  const router = useRouter();
  const { id } = router.query;
  const [game, setGame] = useState<typeof gamesList[0] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!router.isReady) return;

    if (id && typeof id === 'string') {
      const foundGame = gamesList.find((g) => g.id === id);
      if (foundGame) {
        setGame(foundGame);
      } else {
        router.replace('/');
      }
    }
    setIsLoading(false);
  }, [id, router]);

  if (isLoading || !game) {
    return (
      <div className="loading">
        <p>Carregando jogo...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{game.name} - Galeria de Jogos</title>
        <meta name="description" content={game.description} />
      </Head>
      <ThemeToggle />
      <PlayerNameButton />
      <div className="game-page">
        <div className="game-header">
          <button onClick={() => router.push('/')} className="back-button">
            ← Voltar
          </button>
          <h1>{game.name}</h1>
        </div>
        <GameLoader game={game} />
      </div>
    </>
  );
}

