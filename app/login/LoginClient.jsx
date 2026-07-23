'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import styled, { keyframes } from 'styled-components';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Page = styled.div`
  min-height: 100%;
  height: 100%;
  overflow: auto;
  display: grid;
  grid-template-columns: 1.1fr 1fr;

  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
    grid-template-columns: 1fr;
  }
`;

const Hero = styled.section`
  background:
    linear-gradient(160deg, rgba(5, 5, 8, 0.88), rgba(26, 27, 75, 0.55)),
    radial-gradient(ellipse 80% 60% at 20% 80%, rgba(255, 45, 107, 0.35), transparent 55%),
    radial-gradient(ellipse 60% 50% at 90% 10%, rgba(76, 201, 240, 0.2), transparent 50%),
    #050508;
  color: ${({ theme }) => theme.colors.textInverse};
  padding: ${({ theme }) => theme.space[12]} ${({ theme }) => theme.space[8]};
  display: grid;
  grid-template-rows: 1fr auto;
  min-height: 40vh;
  position: relative;
  overflow: hidden;

  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
    min-height: 28vh;
    padding: ${({ theme }) => theme.space[8]} ${({ theme }) => theme.space[4]};
  }
`;

const LogoWrap = styled.div`
  width: min(22rem, 78vw);
  margin: auto;
  animation: ${fadeUp} 500ms ease;
  background: transparent;
  filter: drop-shadow(0 12px 28px rgba(255, 45, 107, 0.45))
    drop-shadow(0 4px 18px rgba(255, 45, 107, 0.25));

  img {
    width: 100%;
    height: auto;
    background: transparent;
  }
`;

const HeroCopy = styled.div`
  justify-self: start;
  max-width: 100%;
`;

const Brand = styled.h1`
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  margin: 0;
  animation: ${fadeUp} 550ms ease 40ms both;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  letter-spacing: -0.02em;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.textInverse};
  text-shadow: 0 2px 18px rgba(0, 0, 0, 0.45);

  span {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const Tagline = styled.p`
  max-width: none;
  margin: ${({ theme }) => theme.space[2]} 0 0;
  font-size: ${({ theme }) => theme.fontSizes.lg};
  color: rgba(247, 247, 251, 0.92);
  animation: ${fadeUp} 600ms ease 80ms both;
  white-space: nowrap;
  text-shadow: 0 1px 12px rgba(0, 0, 0, 0.4);
`;

const Panel = styled.section`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.space[8]} ${({ theme }) => theme.space[6]};
  position: relative;
  background: ${({ theme }) => theme.colors.bg};

  ${({ theme }) =>
    theme.mode === 'dark' &&
    `
    /* Same base tone as the left hero (without pink/cyan glows) */
    background:
      linear-gradient(160deg, rgba(5, 5, 8, 0.88), rgba(26, 27, 75, 0.55)),
      #050508;
  `}

  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
    padding: ${({ theme }) => theme.space[8]} ${({ theme }) => theme.space[4]};
  }
`;

const ThemeCorner = styled.div`
  position: absolute;
  top: ${({ theme }) => theme.space[4]};
  right: ${({ theme }) => theme.space[4]};
`;

const Lead = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  margin-top: 0;
  text-align: left;
`;

const Card = styled.div`
  width: min(420px, 100%);
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: ${({ theme }) => theme.space[8]};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  animation: ${fadeUp} 450ms ease;
  text-align: left;

  h2 {
    text-align: left;
  }
`;

const CardLogo = styled.div`
  width: 4.5rem;
  margin: 0 auto ${({ theme }) => theme.space[5]};
  filter: drop-shadow(0 8px 18px rgba(255, 45, 107, 0.28));

  img {
    width: 100%;
    height: auto;
  }

  @media (min-width: ${({ theme }) => theme.breakpoints.lg}) {
    display: none;
  }
`;

const FormError = styled.p`
  margin: 0 0 ${({ theme }) => theme.space[4]};
  padding: ${({ theme }) => theme.space[3]};
  background: ${({ theme }) => theme.colors.dangerMuted};
  border: 1px solid ${({ theme }) => theme.colors.danger};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.danger};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

export default function LoginClient() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const { signIn } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/admin';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setLoading(true);
    try {
      await signIn(email, password);
      toast('Signed in');
      router.push(redirect);
      router.refresh();
    } catch (err) {
      setFormError(err.message || 'Unable to sign in. Check your email and password.');
      toast(err.message, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page>
      <Hero>
        <LogoWrap>
          <Image
            src="/mpc-mark.png"
            alt="MPC"
            width={500}
            height={500}
            priority
            unoptimized
            sizes="(max-width: 1024px) 78vw, 22rem"
          />
        </LogoWrap>
        <HeroCopy>
          <Brand>
            MPC <span>Booking</span>
          </Brand>
          <Tagline>Internal booking control with a secure client portal.</Tagline>
        </HeroCopy>
      </Hero>
      <Panel>
        <ThemeCorner>
          <ThemeToggle variant="icon" />
        </ThemeCorner>
        <Card>
          <CardLogo>
            <Image
              src="/mpc-mark.png"
              alt=""
              width={500}
              height={500}
              unoptimized
              aria-hidden="true"
            />
          </CardLogo>
          <h2 style={{ marginTop: 0 }} id="login-heading">
            Admin login
          </h2>
          <Lead>Sign in with your email and password.</Lead>
          {formError && (
            <FormError role="alert" aria-live="assertive">
              {formError}
            </FormError>
          )}
          <form onSubmit={handleSubmit} aria-labelledby="login-heading">
            <div style={{ marginBottom: '1rem' }}>
              <Input
                label="Email"
                name="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFormError('');
                }}
                required
                placeholder="admin@example.com"
              />
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <Input
                label="Password"
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFormError('');
                }}
                required
                placeholder="Enter password"
              />
            </div>
            <Button type="submit" loading={loading} style={{ width: '100%' }}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </Card>
      </Panel>
    </Page>
  );
}
