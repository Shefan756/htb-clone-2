FROM parrotsec/security:latest

ENV DEBIAN_FRONTEND=noninteractive \
    DISPLAY=:1 \
    VNC_RESOLUTION=1280x800 \
    VNC_DEPTH=24 \
    USER=attacker \
    PASS=attacker

# Update and upgrade first
RUN apt-get update && apt-get upgrade -y

# GUI stack
RUN apt-get install -y \
    xfce4 xfce4-terminal dbus-x11 x11-xserver-utils \
    x11vnc xvfb novnc websockify supervisor xdotool

# Parrot branding and tools
RUN apt-get install -y \
    parrot-interface parrot-menu parrot-tools-full

# Security tools
RUN apt-get install -y \
    openssh-server sudo curl wget git net-tools iproute2 iputils-ping \
    nmap metasploit-framework sqlmap john hashcat

# Clean up apt cache
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Remove noisy autostart apps
RUN rm -f /etc/xdg/autostart/{blueman,light-locker,nm-applet,polkit-gnome-authentication-agent-1}.desktop

# Create attacker user and preload XFCE config
RUN useradd -m -s /bin/bash "$USER" && echo "$USER:$PASS" | chpasswd && \
    adduser "$USER" sudo && echo "$USER ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers && \
    cp -r /etc/skel/.config /home/$USER/ && chown -R $USER:$USER /home/$USER/.config

# Configure SSH
RUN mkdir -p /var/run/sshd && \
    sed -ri 's/^#?PasswordAuthentication .*/PasswordAuthentication yes/' /etc/ssh/sshd_config && \
    sed -ri 's/^#?PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config

# Copy supervisor config
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose noVNC and SSH
EXPOSE 8081 22

ENTRYPOINT []
CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
