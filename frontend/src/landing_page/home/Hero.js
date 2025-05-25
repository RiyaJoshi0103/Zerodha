import React from "react";

function Hero() {
  return (
    <div className="container p-5 mb-5">
      <div className="text-center">
        <img
          src="media/images/homeHero.png"
          alt="Hero Image"
          className="mb-5 mx-auto d-block"
          style={{ maxWidth: "100%", height: "auto" }}
        />
        <h1 className="mt-5">Invest in everything</h1>
        <p>
          Online platform to invest in stocks, derivatives, mutual funds, and
          more
        </p>
        <button
          className="btn btn-primary fs-5 mb-5 px-4"
          style={{ minWidth: "200px" }}>
          Signup Now
        </button>
      </div>
    </div>
  );
}

export default Hero;
