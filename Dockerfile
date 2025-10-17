FROM parrotsec/security:latest

ENV DEBIAN_FRONTEND=noninteractive \
    DISPLAY=:1 \
    VNC_RESOLUTION=1280x800 \
    VNC_DEPTH=24 \
    USER=attacker \
    PASS=attacker

# Update and install desktop, VNC, noVNC, SSH, supervisor
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
      xfce4 xfce4-terminal dbus-x11 x11-xserver-utils \
      x11vnc xvfb novnc websockify supervisor \
      openssh-server sudo curl wget git net-tools iproute2 iputils-ping \
      nmap metasploit-framework sqlmap john hashcat \
      && apt-get clean && rm -rf /var/lib/apt/lists/*

# Create attacker user
RUN useradd -m -s /bin/bash "$USER" && echo "$USER:$PASS" | chpasswd && \
    adduser "$USER" sudo && echo "$USER ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Configure SSH
RUN mkdir -p /var/run/sshd && \
    sed -ri 's/^#?PasswordAuthentication .*/PasswordAuthentication yes/' /etc/ssh/sshd_config && \
    sed -ri 's/^#?PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config

# Copy supervisor config
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose noVNC (websocket proxy) and SSH
EXPOSE 8081 22

ENTRYPOINT []
# Start everything under supervisor
CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
