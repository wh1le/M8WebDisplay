{
  description = "m8-client development shell and Electron package";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";
    unstable-nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs =
    {
      nixpkgs,
      unstable-nixpkgs,
      ...
    }:
    let
      lib = nixpkgs.lib;

      devSystems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
      ];

      linuxSystems = [
        "x86_64-linux"
        "aarch64-linux"
      ];

      # Wraps the built web assets in nixpkgs' Electron. Runs on NixOS with no
      # AppImage, FUSE or missing system libraries.
      m8-web-display =
        pkgs:
        pkgs.stdenv.mkDerivation (finalAttrs: {
          pname = "m8-web-display";
          version = "0.0.0";

          # Untracked files are invisible to flakes: `git add` electron/ before
          # building.
          src = ./.;

          pnpmDeps = pkgs.fetchPnpmDeps {
            inherit (finalAttrs) pname version src;
            fetcherVersion = 4;
            hash = "sha256-txkgsgqNKPzztnhJCV7PBZ9WKcTRzgSijIHjx312poM=";
          };

          nativeBuildInputs = with pkgs; [
            nodejs
            pnpm
            pnpmConfigHook
            perl
            makeWrapper
          ];

          # Lets scripts/build.sh skip its git lookups (there is no .git here).
          M8_BUILD_ID = finalAttrs.version;

          # pnpmConfigHook has already populated node_modules from the offline
          # store, so build.sh skips its own `pnpm install`.
          buildPhase = ''
            runHook preBuild
            sh scripts/build.sh
            runHook postBuild
          '';

          installPhase = ''
            runHook preInstall

            appDir="$out/share/m8-web-display"
            mkdir -p "$appDir"
            cp -r build electron package.json "$appDir/"

            makeWrapper ${pkgs.electron}/bin/electron $out/bin/m8-web-display \
              --add-flags "$appDir"

            runHook postInstall
          '';

          meta = {
            description = "Web display for M8 Headless";
            homepage = "https://github.com/derkyjadex/M8WebDisplay";
            license = lib.licenses.mit;
            mainProgram = "m8-web-display";
            platforms = lib.platforms.linux;
          };
        });
    in
    {
      packages = lib.genAttrs linuxSystems (
        system:
        let
          pkgs = import nixpkgs { inherit system; };
        in
        {
          default = m8-web-display pkgs;
          m8-web-display = m8-web-display pkgs;
        }
      );

      apps = lib.genAttrs linuxSystems (
        system:
        let
          pkgs = import nixpkgs { inherit system; };
        in
        {
          default = {
            type = "app";
            program = lib.getExe (m8-web-display pkgs);
          };
        }
      );

      devShells = lib.genAttrs devSystems (
        system:
        let
          pkgs = import nixpkgs { inherit system; };
          unstable = import unstable-nixpkgs { inherit system; };
        in
        {
          default = pkgs.mkShell {
            packages = [
              pkgs.nodejs
              pkgs.pnpm
            ]
            ++ lib.optional pkgs.stdenv.isLinux pkgs.electron;

            # Makes the npm `electron` launcher use nixpkgs' Electron, which has
            # the right libraries on NixOS. Empty string is ignored on darwin.
            ELECTRON_OVERRIDE_DIST_PATH = lib.optionalString pkgs.stdenv.isLinux "${pkgs.electron}/bin";
          };
        }
      );
    };
}
