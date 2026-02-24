import Head from "next/head";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import styles from "../styles/Home.module.css";
import LogoColor from "../public/logo_color.svg";
import LoginForm from "components/login/LoginForm";
import Link from "next/link";
import Wordmark from "components/Wordmark";

export default function Login() {
  const [domain, setDomain] = useState("");
  const router = useRouter();

  useEffect(() => {
    setDomain(process.env.NEXT_PUBLIC_API_URL);
  }, []);

  useEffect(() => {
    if (!router.isReady) {
      return;
    }
    if (localStorage.token) {
      router.push("/blasts");
    }
  }, [router.isReady]);

  const onSubmitLogin = (email: string, password: string) => {
    let headers = new Headers();
    headers.append("Accept", "application/json");
    headers.append("Content-Type", "application/json");
    const form = new FormData();
    form.append("email", email);
    form.append("password", password);
    return fetch(`${process.env.NEXT_PUBLIC_API_URL}/login`, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        email,
        password,
      }),
    })
      .then(async (res) => {
        if (res.ok) {
          return res.json();
        }
        const result = await res.json();
        throw result;
      })
      .then((data) => {
        localStorage.token = data.token;
        setTimeout(() => {
          window.location = data.url;
        });
      });
  };
  return (
    <div className={styles.login_container}>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width" />

        <meta
          name="description"
          content="Email Marketing Automation helps you capture leads, run automated campaigns, and send targeted emails."
        />
        <meta property="og:title" content="Email Marketing Automation" />
        <meta
          property="og:description"
          content="Email Marketing Automation helps you capture leads, run automated campaigns, and send targeted emails."
        />
        <meta
          property="og:image"
          content="https://github.com/Ravikant-1811/Email-Marketing-Automation"
        />
        <meta
          property="og:image:alt"
          content="Alerts for product led growth companies"
        />
        <meta property="og:locale" content="en_GB" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          property="og:url"
          content="https://github.com/Ravikant-1811/Email-Marketing-Automation"
        />
        <link
          rel="canonical"
          href="https://github.com/Ravikant-1811/Email-Marketing-Automation"
        />

        <title>Email Marketing Automation</title>
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.gstatic.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <div className={styles.signup_left}>
        <img
          className={styles.signup_logo}
          src={LogoColor}
          width={80}
          height={80}
        />
        <h2 className={styles.signup_title}>Login</h2>
        <LoginForm type="login" perform={onSubmitLogin} />
        <Link href="/signup">
          <a style={{ marginTop: "1em", color: "#4191E4" }}>
            <p>Don't have an account? Click to sign up.</p>
          </a>
        </Link>
        <Wordmark />
      </div>
      <div className={styles.signup_right}></div>
    </div>
  );
}
