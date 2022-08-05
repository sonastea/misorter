const Footer = () => {
  const twitter = "https://twitter.com/TeaDroplets";
  const biasorter = "https://biasorter.tumblr.com/";

  return (
    <footer>
      <div>
        <div style={{ padding: "0.5rem" }}>
          <span>
            Message me on <a href={twitter}>twitter</a> if you find any bugs or
            suggestions
          </span>
        </div>
        <div>
          <span>
            Thanks to <a href={biasorter}>biasorter</a> for the sorting logic
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
