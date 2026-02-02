import time
import sys

def main():
    print("Starting test script...")
    sys.stdout.flush()
    
    for i in range(10):
        print(f"Iteration {i}: This is a fairly long line of text to help fill the buffer and see if it's captured incrementally or not.")
        # Not flushing here to see if it waits
        time.sleep(1)
    
    print("Finished iterations. Now sleeping for 30 seconds...")
    sys.stdout.flush()
    time.sleep(30)
    print("Exiting.")

if __name__ == "__main__":
    main()
